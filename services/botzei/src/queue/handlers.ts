/**
 * Discord button interaction handlers for the queue system.
 *
 * Custom ID scheme:
 *   queue:join:<queueId>
 *   queue:leave:<queueId>
 *   match:ready:<matchId>
 *   match:map:<matchId>:<mapName>
 *   match:result:<matchId>:won|lost
 */

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  EmbedBuilder,
  TextInputStyle,
  ActionRowBuilder as ModalActionRowBuilder,
  ChannelType,
  Client,
  TextChannel,
  ThreadAutoArchiveDuration,
} from 'discord.js';

import { api } from '../utils/api.js';
import { saveState } from './storage.js';
import {
  findQueueById,
  joinQueue,
  leaveQueue,
  restorePlayers,
} from './queue-service.js';
import {
  createMatch,
  findMatchById,
  findActiveReadyChecks,
  findActiveMapSelections,
  readyUp,
  resolveReadyTimeout,
  resolveMapTimeout,
  selectMap,
  reportResult,
  resolveDispute,
  setReadyMessageId,
  setMapMessageId,
} from './match-service.js';
import { QUEUE_CONFIG } from './config.js';
import { Match, Queue, QueuePlayer } from './types.js';
import {
  buildQueueEmbed,
  buildQueueButtons,
  buildReadyUpEmbed,
  buildReadyUpRow,
  buildMapSelectionEmbed,
  buildMapSelectionRows,
  buildReadyCancelledEmbed,
  buildReadyForfeitEmbed,
  buildMapCancelledEmbed,
  buildMapForfeitEmbed,
  buildMapDecidedEmbed,
  buildReportingRow,
  buildCompletedEmbed,
  buildDisputedEmbed,
  buildDisputeButtons,
} from './ui.js';

const isProd = process.env.NODE_ENV === 'production';
const GAME_FEED_CHANNEL_ID = isProd ? '1481570502521917562' : '1493028101217714176';

// ---------------------------------------------------------------------------
// Timeout management (one setTimeout per active phase per match)
// ---------------------------------------------------------------------------

// key format: "ready:{matchId}" or "map:{matchId}"
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(key: string): void {
  const timer = activeTimers.get(key);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(key);
  }
}

function scheduleTimer(
  key: string,
  delayMs: number,
  fn: () => Promise<void>,
): void {
  clearTimer(key);
  const timer = setTimeout(() => {
    activeTimers.delete(key);
    fn().catch((err) => console.error(`[Queue] Timer ${key} error:`, err));
  }, Math.max(0, delayMs));
  activeTimers.set(key, timer);
}

// ---- Ready-up timeout ----

async function onReadyExpired(client: Client, matchId: string): Promise<void> {
  const match = findMatchById(matchId);
  if (!match || match.state !== 'ready_check') return;

  // Release game server if one was assigned
  if (match.gameServerId) {
    try { await api.setServerAvailability(match.gameServerId, true); } catch {}
  }

  const result = resolveReadyTimeout(matchId);
  if (!result) return;

  try {
    const thread = await client.channels.fetch(result.match.threadId);
    if (!thread || !('send' in thread)) return;

    if (result.match.readyMessageId) {
      try {
        const msg = await (thread as any).messages.fetch(result.match.readyMessageId);
        if (result.outcome === 'cancelled') {
          await msg.edit({ embeds: [buildReadyCancelledEmbed(result.match)], components: [] });
        } else {
          await msg.edit({ embeds: [buildReadyForfeitEmbed(result.match)], components: [] });
        }
      } catch {}
    }

    if (result.outcome === 'cancelled') {
      await thread.send({ content: '❌ Match cancelled — neither player readied up.' });
    } else {
      const winner = result.winnerId === result.match.player1.discordId
        ? result.match.player1 : result.match.player2;
      const noShow = result.winnerId === result.match.player1.discordId
        ? result.match.player2 : result.match.player1;
      await thread.send({
        content: `🏆 **${winner.username}** wins by forfeit. **${noShow.username}** failed to ready up.`,
      });
      postToGameFeedDirect(client, result.match).catch(() => {});
    }

    renameThread(client, result.match).catch(() => {});
    scheduleThreadDelete(client, result.match.threadId);
  } catch (err) {
    console.error('[Queue] Failed to resolve ready timeout in thread:', err);
  }
}

function startReadyTimer(client: Client, match: Match): void {
  const delay = (match.readyUpExpiresAt ?? 0) - Date.now();
  scheduleTimer(`ready:${match.id}`, delay, () => onReadyExpired(client, match.id));
}

// ---- Map selection timeout ----

async function onMapExpired(client: Client, matchId: string): Promise<void> {
  const match = findMatchById(matchId);
  if (!match || match.state !== 'map_selection') return;

  const result = resolveMapTimeout(matchId);
  if (!result) return;

  try {
    const thread = await client.channels.fetch(result.match.threadId);
    if (!thread || !('send' in thread)) return;

    if (result.match.mapMessageId) {
      try {
        const msg = await (thread as any).messages.fetch(result.match.mapMessageId);
        if (result.outcome === 'cancelled') {
          await msg.edit({ embeds: [buildMapCancelledEmbed(result.match)], components: [] });
        } else {
          await msg.edit({ embeds: [buildMapForfeitEmbed(result.match)], components: [] });
        }
      } catch {}
    }

    if (result.outcome === 'cancelled') {
      await thread.send({ content: '❌ Match cancelled — neither player picked a map.' });
    } else {
      const winner = result.winnerId === result.match.player1.discordId
        ? result.match.player1 : result.match.player2;
      const noShow = result.winnerId === result.match.player1.discordId
        ? result.match.player2 : result.match.player1;
      await thread.send({
        content: `🏆 **${winner.username}** wins by forfeit. **${noShow.username}** failed to pick a map.`,
      });
      postToGameFeedDirect(client, result.match).catch(() => {});
    }

    renameThread(client, result.match).catch(() => {});
    scheduleThreadDelete(client, result.match.threadId);
  } catch (err) {
    console.error('[Queue] Failed to resolve map timeout in thread:', err);
  }
}

function startMapTimer(client: Client, match: Match): void {
  const delay = (match.mapSelectionExpiresAt ?? 0) - Date.now();
  scheduleTimer(`map:${match.id}`, delay, () => onMapExpired(client, match.id));
}

// ---- Startup recovery ----

/**
 * Called once the bot is ready. Resumes timeouts for matches stuck in
 * ready_check or map_selection after a restart.
 */
export function initTimers(client: Client): void {
  const readyChecks = findActiveReadyChecks();
  const mapSelections = findActiveMapSelections();
  const total = readyChecks.length + mapSelections.length;
  if (total === 0) return;
  console.log(`[Queue] Resuming ${readyChecks.length} ready + ${mapSelections.length} map timer(s)`);
  for (const match of readyChecks) startReadyTimer(client, match);
  for (const match of mapSelections) startMapTimer(client, match);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayName(interaction: ButtonInteraction): string {
  if (interaction.member && 'nickname' in interaction.member) {
    return interaction.member.nickname || interaction.user.displayName;
  }
  return interaction.user.displayName;
}

async function ensureAccount(interaction: ButtonInteraction): Promise<void> {
  const discordId = interaction.user.id;
  try {
    const user = await api.getUserByDiscordId(discordId);
    if (user) return;
  } catch {}
  const username = getDisplayName(interaction);
  try {
    await api.createUser({ discordId, username });
  } catch (err: any) {
    if (!err.message?.includes('already exists')) {
      console.error('[Queue] Failed to auto-create account:', err.message);
    }
  }
}

// Platform → user field mapping
const PLATFORM_FIELD: Record<string, { field: string; label: string; placeholder: string }> = {
  xbox: { field: 'xboxGamertag', label: 'Xbox Gamertag', placeholder: 'Your Xbox gamertag' },
  ps3: { field: 'ps3Username', label: 'PS3 Username', placeholder: 'Your PSN username' },
  playstation: { field: 'ps3Username', label: 'PS3 Username', placeholder: 'Your PSN username' },
  plutonium: { field: 'plutoniumUsername', label: 'Plutonium Username', placeholder: 'Your Plutonium username' },
  iw4x: { field: 'plutoniumUsername', label: 'IW4X Username', placeholder: 'Your IW4X username' },
  'cross-platform': { field: 'activisionId', label: 'Activision ID', placeholder: 'Your Activision ID' },
};

function getPlatformField(platform: string): { field: string; label: string; placeholder: string } | null {
  return PLATFORM_FIELD[platform.toLowerCase()] ?? null;
}

// Store pending queue joins for users going through the gamertag modal
const pendingQueueJoins = new Map<string, string>(); // discordId -> queueId

async function refreshQueueMessage(
  interaction: ButtonInteraction,
  queue: Queue,
): Promise<void> {
  if (!queue.messageId) return;
  try {
    const channel = await interaction.client.channels.fetch(queue.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const msg = await (channel as TextChannel).messages
      .fetch(queue.messageId)
      .catch(() => null);
    if (!msg) return;
    const { embed, files } = buildQueueEmbed(queue);
    await msg.edit({
      embeds: [embed],
      components: buildQueueButtons(queue),
      files,
    });
  } catch (err) {
    console.error('[Queue] Failed to refresh queue message:', err);
  }
}

export interface EloChanges {
  winner: { change: number | null };
  loser: { change: number | null };
}

/** Create a match record in the backend. Returns ELO changes if available. */
async function createBackendMatch(match: Match): Promise<EloChanges | null> {
  if (!match.winnerId || !match.finalMap) return null;
  try {
    const result = await api.completeMatch({
      challengerDiscordId: match.player1.discordId,
      challengeeDiscordId: match.player2.discordId,
      winnerDiscordId: match.winnerId,
      leaderboardId: match.leaderboardId,
      map: match.finalMap,
    });
    return result?.eloChanges ?? null;
  } catch (err) {
    console.error('[Queue] Failed to create backend match record:', err);
    return null;
  }
}

/** Rename a match thread to show the winner and map. */
async function renameThread(client: Client, match: Match): Promise<void> {
  if (!match.winnerId) return;
  try {
    const thread = await client.channels.fetch(match.threadId);
    if (thread && 'setName' in thread) {
      const winner = match.winnerId === match.player1.discordId
        ? match.player1 : match.player2;
      const loser = match.winnerId === match.player1.discordId
        ? match.player2 : match.player1;
      const mapSuffix = match.finalMap ? ` — ${match.finalMap}` : '';
      await (thread as any).setName(
        `🏆 ${winner.username} vs ${loser.username}${mapSuffix}`.slice(0, 100),
      );
    }
  } catch {}
}

const THREAD_DELETE_DELAY_MS = 30 * 60 * 1000; // 30 minutes

/** Delete the match thread after a short delay. */
function scheduleThreadDelete(client: Client, threadId: string): void {
  setTimeout(async () => {
    try {
      const thread = await client.channels.fetch(threadId);
      if (thread && 'delete' in thread) {
        await (thread as any).delete('Match finalized');
      }
    } catch (err) {
      console.error('[Queue] Failed to delete match thread:', err);
    }
  }, THREAD_DELETE_DELAY_MS);
}

/** Refresh queue message using just a Client reference. */
async function refreshQueueMessageByQueue(
  client: Client,
  queue: Queue,
): Promise<void> {
  if (!queue.messageId) return;
  try {
    const channel = await client.channels.fetch(queue.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const msg = await (channel as TextChannel).messages
      .fetch(queue.messageId)
      .catch(() => null);
    if (!msg) return;
    const { embed, files } = buildQueueEmbed(queue);
    await msg.edit({
      embeds: [embed],
      components: buildQueueButtons(queue),
      files,
    });
  } catch (err) {
    console.error('[Queue] Failed to refresh queue message:', err);
  }
}

/** Get the channels to post results to for a match. */
function getResultChannels(match: Match): string[] {
  const queue = findQueueById(match.queueId);
  if (queue?.resultChannelIds?.length) {
    return queue.resultChannelIds;
  }
  return [GAME_FEED_CHANNEL_ID];
}

function buildResultEmbed(match: Match, eloChanges?: EloChanges | null): any {
  const winnerId = match.winnerId!;
  const loserId = winnerId === match.player1.discordId ? match.player2.discordId : match.player1.discordId;
  const mapText = match.finalMap ? ` on ${match.finalMap}` : '';
  const isForfeit = match.completionType === 'ready_forfeit' || match.completionType === 'map_forfeit';
  const tag = isForfeit ? '`FORFEIT`' : '`ELO`';

  const winnerElo = eloChanges?.winner?.change;
  const loserElo = eloChanges?.loser?.change;
  const winnerEloText = winnerElo != null ? ` (+${winnerElo})` : '';
  const loserEloText = loserElo != null ? ` (${loserElo})` : '';

  return {
    color: 0xff4444,
    description: `<@${winnerId}>${winnerEloText} beat <@${loserId}>${loserEloText}${mapText} ${tag}`,
    footer: { text: `${match.game} · ${match.platform}` },
    timestamp: new Date().toISOString(),
  };
}

/** Post match result to all configured result channels. */
async function postToGameFeed(
  interaction: ButtonInteraction,
  match: Match,
  eloChanges?: EloChanges | null,
): Promise<void> {
  const channels = getResultChannels(match);
  const embed = buildResultEmbed(match, eloChanges);
  for (const channelId of channels) {
    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (channel && 'send' in channel) {
        await channel.send({
          embeds: [embed],
          allowedMentions: {
            users: [match.player1.discordId, match.player2.discordId],
          },
        });
      }
    } catch (err) {
      console.error(`[Queue] Failed to post result to ${channelId}:`, err);
    }
  }
}

/** Post match result (used from timer callbacks where we only have a client). */
async function postToGameFeedDirect(
  client: Client,
  match: Match,
): Promise<void> {
  const channels = getResultChannels(match);
  const embed = buildResultEmbed(match);
  for (const channelId of channels) {
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel && 'send' in channel) {
        await channel.send({
          embeds: [embed],
          allowedMentions: {
            users: [match.player1.discordId, match.player2.discordId],
          },
        });
      }
    } catch (err) {
      console.error(`[Queue] Failed to post result to ${channelId}:`, err);
    }
  }
}

async function notifyRefsOfDispute(
  interaction: ButtonInteraction,
  match: Match,
): Promise<void> {
  try {
    const thread = await interaction.client.channels.fetch(match.threadId);
    if (!thread || !('send' in thread)) return;
    const guild = interaction.guild;
    const refRole = guild?.roles.cache.find((r) => r.name === 'Ref');
    const refPing = refRole ? `<@&${refRole.id}>` : '**Refs**';
    await thread.send({
      content: `${refPing} — this match is disputed. Both players reported a win. Please review.`,
      allowedMentions: {
        roles: refRole ? [refRole.id] : [],
      },
    });
  } catch (err) {
    console.error('[Queue] Failed to notify refs of dispute:', err);
  }
}

/** Create the match thread and post the ready-up message. */
async function openMatchThread(
  interaction: ButtonInteraction,
  queue: Queue,
  player1: QueuePlayer,
  player2: QueuePlayer,
  gameServer?: { id: string; ip: string; port: number },
): Promise<Match> {
  const threadChannelId = queue.matchThreadChannelId || QUEUE_CONFIG.MATCH_THREAD_CHANNEL_ID;
  const channel = await interaction.client.channels.fetch(threadChannelId);
  if (!channel || channel.type !== ChannelType.GuildText) {
    throw new Error(
      `Match thread channel ${threadChannelId} is not a guild text channel`,
    );
  }

  const thread = await (channel as TextChannel).threads.create({
    name: `${player1.username} vs ${player2.username}`.slice(0, 100),
    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
    type: ChannelType.PublicThread,
    reason: `Queue match for ${queue.title}`,
  });

  const match = createMatch({
    queue,
    threadId: thread.id,
    player1,
    player2,
    gameServer,
  });

  const msg = await thread.send({
    content: `<@${match.player1.discordId}> <@${match.player2.discordId}>`,
    embeds: [buildReadyUpEmbed(match)],
    components: [buildReadyUpRow(match)],
    allowedMentions: {
      users: [match.player1.discordId, match.player2.discordId],
    },
  });

  setReadyMessageId(match.id, msg.id);

  // Start the countdown timer
  startReadyTimer(interaction.client, match);

  return match;
}

// ---------------------------------------------------------------------------
// queue:join:<queueId>
// ---------------------------------------------------------------------------

export async function handleQueueJoin(
  interaction: ButtonInteraction,
): Promise<void> {
  const queueId = interaction.customId.split(':')[2];
  const discordId = interaction.user.id;
  const queue = findQueueById(queueId);

  if (!queue) {
    await interaction.reply({ content: 'This queue no longer exists.', ephemeral: true });
    return;
  }

  // Check if we need a gamertag for this platform
  const platformInfo = getPlatformField(queue.platform);

  if (platformInfo) {
    // Fetch user to check if gamertag is already set
    let user: any = null;
    try {
      user = await api.getUserByDiscordId(discordId);
    } catch {}

    const fieldValue = user?.[platformInfo.field];
    const needsGamertag = !user || !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');

    if (needsGamertag) {
      pendingQueueJoins.set(discordId, queueId);
      try {
        const modal = new ModalBuilder()
          .setCustomId('queue:gamertag_modal')
          .setTitle(`Set your ${platformInfo.label}`);
        const input = new TextInputBuilder()
          .setCustomId('gamertag_value')
          .setLabel(platformInfo.label)
          .setPlaceholder(platformInfo.placeholder)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50);
        modal.addComponents(
          new ModalActionRowBuilder<TextInputBuilder>().addComponents(input) as any,
        );
        await interaction.showModal(modal);
      } catch (err) {
        console.error('[Queue] Failed to show gamertag modal (interaction may have expired):', err);
        pendingQueueJoins.delete(discordId);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'Something went wrong. Try again.', ephemeral: true }).catch(() => {});
        }
      }
      return;
    }
  }

  // Gamertag already set (or no platform field needed) — proceed normally
  // Ensure account exists before joining
  await ensureAccount(interaction);
  await doQueueJoin(interaction, queueId);
}

/** The actual queue join logic, called after gamertag is confirmed. */
async function doQueueJoin(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  queueId: string,
): Promise<void> {
  // If interaction hasn't been deferred/replied yet, defer it
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const displayName = 'member' in interaction && interaction.member && 'nickname' in interaction.member
    ? ((interaction.member as any).nickname || interaction.user.displayName)
    : interaction.user.displayName;

  const result = joinQueue(queueId, {
    discordId: interaction.user.id,
    username: displayName,
    joinedAt: Date.now(),
  });

  if (!result.ok) {
    await interaction.editReply({ content: result.error });
    return;
  }

  await refreshQueueMessageByQueue(interaction.client, result.queue);

  if (!result.popped) {
    await interaction.editReply({
      content: `You're in the queue for **${result.queue.title}**. Waiting for one more player.`,
    });
    return;
  }

  // Queue popped — handle based on queue type
  if (result.queue.queueType === 'plutonium') {
    // Plutonium queue: find an available server first
    let gameServer: any = null;
    try {
      gameServer = await api.getAvailableServer(result.queue.id);
    } catch {}

    if (!gameServer) {
      // No server available — put players back
      restorePlayers(result.queue.id, result.player1, result.player2);
      await refreshQueueMessageByQueue(interaction.client, result.queue);
      await interaction.editReply({
        content: 'No game servers are available right now. You\'ve been returned to the queue.',
      });
      return;
    }

    // Mark server as busy
    try {
      await api.setServerAvailability(gameServer.id, false);
    } catch {}

    // Create a match thread with ready-up (same as standard, but with gameServer attached)
    try {
      const match = await openMatchThread(
        interaction as any,
        result.queue,
        result.player1,
        result.player2,
        { id: gameServer.id, ip: gameServer.ip, port: gameServer.port },
      );
      await refreshQueueMessageByQueue(interaction.client, result.queue);
      await interaction.editReply({
        content: `Match found! Head to <#${match.threadId}> and ready up.`,
      });
    } catch (err) {
      console.error('[Queue] Failed to open plutonium match thread:', err);
      // Release server and restore players
      try { await api.setServerAvailability(gameServer.id, true); } catch {}
      restorePlayers(result.queue.id, result.player1, result.player2);
      await refreshQueueMessageByQueue(interaction.client, result.queue);
      await interaction.editReply({
        content: 'Failed to create the match thread. You\'ve been returned to the queue.',
      });
    }
    return;
  }

  // Standard queue: create the match thread
  try {
    const match = await openMatchThread(
      interaction as any,
      result.queue,
      result.player1,
      result.player2,
    );
    await refreshQueueMessageByQueue(interaction.client, result.queue);
    await interaction.editReply({
      content: `Match found! Head to <#${match.threadId}> and ready up.`,
    });
  } catch (err) {
    console.error('[Queue] Failed to open match thread:', err);
    restorePlayers(result.queue.id, result.player1, result.player2);
    await refreshQueueMessageByQueue(interaction.client, result.queue);
    await interaction.editReply({
      content:
        'Failed to create the match thread. Both players have been returned to the queue.',
    });
  }
}

/** Handle the gamertag modal submission, then join the queue. */
export async function handleGamertagModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const discordId = interaction.user.id;
  const queueId = pendingQueueJoins.get(discordId);
  pendingQueueJoins.delete(discordId);

  if (!queueId) {
    await interaction.reply({ content: 'No pending queue join. Try again.', ephemeral: true });
    return;
  }

  const value = interaction.fields.getTextInputValue('gamertag_value').trim();
  if (!value) {
    await interaction.reply({ content: 'Gamertag cannot be empty.', ephemeral: true });
    return;
  }

  const queue = findQueueById(queueId);
  if (!queue) {
    await interaction.reply({ content: 'Queue no longer exists.', ephemeral: true });
    return;
  }

  // Ensure account exists first
  let user: any = null;
  try {
    user = await api.getUserByDiscordId(discordId);
  } catch {}
  if (!user) {
    const username = 'member' in interaction && interaction.member && 'nickname' in interaction.member
      ? ((interaction.member as any).nickname || interaction.user.displayName)
      : interaction.user.displayName;
    try {
      await api.createUser({ discordId, username });
    } catch {}
  }

  // Save the gamertag
  const platformInfo = getPlatformField(queue.platform);
  if (platformInfo) {
    try {
      await api.updateUserProfile(discordId, { [platformInfo.field]: value });
    } catch (err) {
      console.error('[Queue] Failed to save gamertag:', err);
    }

    // If Plutonium, resolve and save plutoId — reject if username doesn't exist
    if (platformInfo.field === 'plutoniumUsername') {
      const plutoId = await api.resolvePlutoId(value);
      if (!plutoId) {
        await interaction.reply({
          content: `Plutonium username **${value}** was not found. Check your spelling and try again.`,
          ephemeral: true,
        });
        // Clear the invalid username
        try {
          await api.updateUserProfile(discordId, { plutoniumUsername: '' });
        } catch {}
        return;
      }
      try {
        const u = await api.getUserByDiscordId(discordId);
        if (u?.id) {
          await api.setPlutoId(u.id, plutoId);
        }
      } catch (err) {
        console.error('[Queue] Failed to save plutoId:', err);
      }
    }
  }

  // Now join the queue
  await doQueueJoin(interaction, queueId);
}

// ---------------------------------------------------------------------------
// queue:leave:<queueId>
// ---------------------------------------------------------------------------

export async function handleQueueLeave(
  interaction: ButtonInteraction,
): Promise<void> {
  const queueId = interaction.customId.split(':')[2];
  const result = leaveQueue(queueId, interaction.user.id);

  if (!result.ok) {
    await interaction.reply({
      content: result.error || 'Unable to leave this queue.',
      ephemeral: true,
    });
    return;
  }

  if (result.queue) await refreshQueueMessage(interaction, result.queue);
  await interaction.reply({
    content: 'You left the queue.',
    ephemeral: true,
  });
}

// ---------------------------------------------------------------------------
// match:ready:<matchId>
// ---------------------------------------------------------------------------

export async function handleReadyUp(
  interaction: ButtonInteraction,
): Promise<void> {
  const matchId = interaction.customId.split(':')[2];

  const result = readyUp(matchId, interaction.user.id);

  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (!result.bothReady) {
    // One player ready — update the embed to reflect, keep the button
    await interaction.update({
      embeds: [buildReadyUpEmbed(result.match)],
      components: [buildReadyUpRow(result.match)],
    });
    return;
  }

  // Both ready — stop the ready timer
  clearTimer(`ready:${matchId}`);

  const match = result.match;

  // Plutonium queue: send connect info and done
  if (match.queueType === 'plutonium' && match.gameServerIp) {
    const connectCmd = `connect ${match.gameServerIp}:${match.gameServerPort}`;

    await interaction.update({
      content: '',
      embeds: [
        new EmbedBuilder()
          .setTitle('Both Players Ready — Connect Now')
          .setColor(0x22c55e)
          .setDescription(
            `<@${match.player1.discordId}> vs <@${match.player2.discordId}>\n\n` +
            `**Paste this in your console:**\n\`\`\`\n${connectCmd}\n\`\`\``,
          )
          .setFooter({ text: '1v1 Leaderboards' })
          .setTimestamp(),
      ],
      components: [],
    });

    // Re-ping in a new message
    try {
      const thread = await interaction.client.channels.fetch(match.threadId);
      if (thread && 'send' in thread) {
        await thread.send({
          content: `<@${match.player1.discordId}> <@${match.player2.discordId}> — connect to the server!`,
          allowedMentions: {
            users: [match.player1.discordId, match.player2.discordId],
          },
        });
      }
    } catch {}

    // Mark match as completed (no map selection or reporting for plutonium)
    match.state = 'completed';
    match.completionType = 'normal';
    match.completedAt = Date.now();
    saveState();

    scheduleThreadDelete(interaction.client, match.threadId);
    return;
  }

  // Standard queue: transition to map selection
  await interaction.update({
    content: '✅ Both players ready — map selection below.',
    embeds: [],
    components: [],
  });

  try {
    const thread = await interaction.client.channels.fetch(match.threadId);
    if (thread && 'send' in thread) {
      const mapMsg = await thread.send({
        content: `<@${match.player1.discordId}> <@${match.player2.discordId}> — pick a map!`,
        embeds: [buildMapSelectionEmbed(match)],
        components: buildMapSelectionRows(match),
        allowedMentions: {
          users: [match.player1.discordId, match.player2.discordId],
        },
      });
      setMapMessageId(match.id, mapMsg.id);
      startMapTimer(interaction.client, match);
    }
  } catch (err) {
    console.error('[Queue] Failed to post map selection message:', err);
  }
}

// ---------------------------------------------------------------------------
// match:map:<matchId>:<mapName>
// ---------------------------------------------------------------------------

export async function handleMatchMapPick(
  interaction: ButtonInteraction,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const mapName = parts.slice(3).join(':');

  const result = selectMap(matchId, interaction.user.id, mapName);

  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (result.waiting) {
    // Update the embed to show this player's pick status (without revealing the map to the other player)
    await interaction.update({
      embeds: [buildMapSelectionEmbed(result.match)],
      components: buildMapSelectionRows(result.match),
    });
    // Ephemeral confirmation to the picker
    try {
      await interaction.followUp({
        content: `You picked **${result.pickedMap}**. Waiting for the other player...`,
        ephemeral: true,
      });
    } catch {}
    return;
  }

  // Both picked — stop the map timer, show result
  clearTimer(`map:${matchId}`);

  await interaction.update({
    embeds: [buildMapDecidedEmbed(result.match, result.randomized)],
    components: [buildReportingRow(result.match)],
  });
}

// ---------------------------------------------------------------------------
// match:result:<matchId>:won|lost
// ---------------------------------------------------------------------------

export async function handleMatchResult(
  interaction: ButtonInteraction,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const matchId = parts[2];
  const outcome = parts[3] as 'won' | 'lost';

  if (outcome !== 'won' && outcome !== 'lost') {
    await interaction.reply({
      content: 'Invalid result button.',
      ephemeral: true,
    });
    return;
  }

  const result = reportResult(matchId, interaction.user.id, outcome);

  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (result.kind === 'waiting') {
    await interaction.reply({
      content:
        'Your **I Won** report is locked in. Waiting for the other player to report.',
      ephemeral: true,
    });
    return;
  }

  if (result.kind === 'resolved') {
    // Create backend match first to get ELO changes
    const eloChanges = await createBackendMatch(result.match);

    await interaction.update({
      embeds: [buildCompletedEmbed(result.match, eloChanges)],
      components: [],
    });
    postToGameFeed(interaction, result.match, eloChanges).catch((err) =>
      console.error('[Queue] Game feed post failed:', err),
    );
    renameThread(interaction.client, result.match).catch(() => {});
    scheduleThreadDelete(interaction.client, result.match.threadId);
    return;
  }

  // Disputed
  await interaction.update({
    embeds: [buildDisputedEmbed(result.match)],
    components: buildDisputeButtons(result.match),
  });
  notifyRefsOfDispute(interaction, result.match).catch((err) =>
    console.error('[Queue] Ref notification failed:', err),
  );
}

// ---------------------------------------------------------------------------
// match:concede:<matchId>:<winnerId>  (player concedes)
// match:ref:<matchId>:<winnerId>      (ref forces result)
// ---------------------------------------------------------------------------

export async function handleDisputeResolve(
  interaction: ButtonInteraction,
): Promise<void> {
  const parts = interaction.customId.split(':');
  const action = parts[1]; // 'concede' or 'ref'
  const matchId = parts[2];
  const winnerId = parts[3];

  const match = findMatchById(matchId);
  if (!match) {
    await interaction.reply({ content: 'Match not found.', ephemeral: true });
    return;
  }

  if (match.state !== 'disputed') {
    await interaction.reply({ content: 'This match is no longer disputed.', ephemeral: true });
    return;
  }

  const userId = interaction.user.id;

  if (action === 'concede') {
    // Only the player giving the win to the OTHER player can click
    // Button "Give win to P2" has winnerId=P2, so only P1 should click it
    const isP1 = userId === match.player1.discordId;
    const isP2 = userId === match.player2.discordId;

    if (!isP1 && !isP2) {
      await interaction.reply({ content: 'Only match participants can concede.', ephemeral: true });
      return;
    }

    // The player clicking must be the one giving the win away (not to themselves)
    if (winnerId === userId) {
      await interaction.reply({ content: "You can't give the win to yourself. Use the other button to concede.", ephemeral: true });
      return;
    }
  } else if (action === 'ref') {
    // Only users with the Ref role can use ref buttons
    const guild = interaction.guild;
    const refRole = guild?.roles.cache.find((r) => r.name === 'Ref');
    const memberRoles = interaction.member && 'roles' in interaction.member
      ? interaction.member.roles
      : null;
    const hasRef = refRole && memberRoles && typeof memberRoles !== 'string'
      && 'cache' in memberRoles
      && (memberRoles as any).cache.has(refRole.id);

    if (!hasRef) {
      await interaction.reply({ content: 'Only refs can force a match result.', ephemeral: true });
      return;
    }
  } else {
    await interaction.reply({ content: 'Invalid action.', ephemeral: true });
    return;
  }

  const result = resolveDispute(matchId, winnerId);
  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  const eloChanges = await createBackendMatch(result.match);

  const resolvedBy = action === 'ref'
    ? `Resolved by ref <@${userId}>`
    : `${interaction.user.displayName} conceded`;

  await interaction.update({
    embeds: [buildCompletedEmbed(result.match, eloChanges)],
    components: [],
  });

  // Post follow-up with context
  try {
    const thread = await interaction.client.channels.fetch(result.match.threadId);
    if (thread && 'send' in thread) {
      await thread.send({ content: resolvedBy });
    }
  } catch {}

  postToGameFeed(interaction, result.match, eloChanges).catch(() => {});
  renameThread(interaction.client, result.match).catch(() => {});
  scheduleThreadDelete(interaction.client, result.match.threadId);
}

export { findMatchById, findQueueById };
