/**
 * Plutonium queue button handlers.
 *
 * Custom ID scheme (prefixed with pq: to avoid conflicts with standard queue):
 *   pq:join:<queueId>
 *   pq:leave:<queueId>
 *   pq:ready:<matchId>
 */

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  ActionRowBuilder as ModalActionRowBuilder,
  ChannelType,
  Client,
  TextChannel,
  ThreadAutoArchiveDuration,
} from 'discord.js';

import { api } from '../utils/api.js';
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
  readyUp,
  resolveReadyTimeout,
  setReadyMessageId,
} from './match-service.js';
import { PlutoMatch, PlutoQueue, PlutoQueuePlayer } from './types.js';
import {
  buildQueueEmbed,
  buildQueueButtons,
  buildReadyUpEmbed,
  buildReadyUpRow,
  buildConnectEmbed,
  buildReadyCancelledEmbed,
  buildReadyForfeitEmbed,
} from './ui.js';

const THREAD_DELETE_DELAY_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------------------
// Timers
// ---------------------------------------------------------------------------

const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearTimer(key: string): void {
  const timer = activeTimers.get(key);
  if (timer) { clearTimeout(timer); activeTimers.delete(key); }
}

function startReadyTimer(client: Client, match: PlutoMatch): void {
  const key = `pq:ready:${match.id}`;
  clearTimer(key);
  const delay = Math.max(0, (match.readyUpExpiresAt ?? 0) - Date.now());
  const timer = setTimeout(() => {
    activeTimers.delete(key);
    onReadyExpired(client, match.id).catch((err) =>
      console.error('[PlutoQueue] Ready timeout error:', err),
    );
  }, delay);
  activeTimers.set(key, timer);
}

async function onReadyExpired(client: Client, matchId: string): Promise<void> {
  const match = findMatchById(matchId);
  if (!match || match.state !== 'ready_check') return;

  // Release game server
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
          await msg.edit({ embeds: [buildReadyForfeitEmbed(result.match, result.winnerId!)], components: [] });
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
    }

    scheduleThreadDelete(client, result.match.threadId);
  } catch (err) {
    console.error('[PlutoQueue] Failed to resolve ready timeout:', err);
  }
}

export function initPlutoTimers(client: Client): void {
  const checks = findActiveReadyChecks();
  if (checks.length === 0) return;
  console.log(`[PlutoQueue] Resuming ${checks.length} ready-check timer(s)`);
  for (const match of checks) {
    startReadyTimer(client, match);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayName(interaction: ButtonInteraction | ModalSubmitInteraction): string {
  if ('member' in interaction && interaction.member && 'nickname' in interaction.member) {
    return (interaction.member as any).nickname || interaction.user.displayName;
  }
  return interaction.user.displayName;
}

async function ensureAccount(interaction: ButtonInteraction): Promise<void> {
  const discordId = interaction.user.id;
  try {
    const user = await api.getUserByDiscordId(discordId);
    if (user) return;
  } catch {}
  try {
    await api.createUser({ discordId, username: getDisplayName(interaction) });
  } catch (err: any) {
    if (!err.message?.includes('already exists')) {
      console.error('[PlutoQueue] Failed to create account:', err.message);
    }
  }
}

async function refreshQueueMessage(client: Client, queue: PlutoQueue): Promise<void> {
  if (!queue.messageId) return;
  try {
    const channel = await client.channels.fetch(queue.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) return;
    const msg = await (channel as TextChannel).messages.fetch(queue.messageId).catch(() => null);
    if (!msg) return;
    const { embed, files } = buildQueueEmbed(queue);
    await msg.edit({ embeds: [embed], components: buildQueueButtons(queue), files });
  } catch (err) {
    console.error('[PlutoQueue] Failed to refresh queue message:', err);
  }
}

function scheduleThreadDelete(client: Client, threadId: string): void {
  setTimeout(async () => {
    try {
      const thread = await client.channels.fetch(threadId);
      if (thread && 'delete' in thread) await (thread as any).delete('Match finalized');
    } catch {}
  }, THREAD_DELETE_DELAY_MS);
}

// Gamertag platform mapping
const PLATFORM_FIELD: Record<string, { field: string; label: string; placeholder: string }> = {
  plutonium: { field: 'plutoniumUsername', label: 'Plutonium Username', placeholder: 'Your Plutonium username' },
  iw4x: { field: 'plutoniumUsername', label: 'IW4X Username', placeholder: 'Your IW4X username' },
  xbox: { field: 'xboxGamertag', label: 'Xbox Gamertag', placeholder: 'Your Xbox gamertag' },
  ps3: { field: 'ps3Username', label: 'PS3 Username', placeholder: 'Your PSN username' },
  'cross-platform': { field: 'activisionId', label: 'Activision ID', placeholder: 'Your Activision ID' },
};

function getPlatformField(platform: string) {
  return PLATFORM_FIELD[platform.toLowerCase()] ?? null;
}

const pendingQueueJoins = new Map<string, string>();

// ---------------------------------------------------------------------------
// pq:join:<queueId>
// ---------------------------------------------------------------------------

export async function handleQueueJoin(interaction: ButtonInteraction): Promise<void> {
  const queueId = interaction.customId.split(':')[2];
  const discordId = interaction.user.id;
  const queue = findQueueById(queueId);

  if (!queue) {
    await interaction.reply({ content: 'This queue no longer exists.', ephemeral: true });
    return;
  }

  // Check gamertag
  const platformInfo = getPlatformField(queue.platform);
  if (platformInfo) {
    let user: any = null;
    try { user = await api.getUserByDiscordId(discordId); } catch {}

    const fieldValue = user?.[platformInfo.field];
    const needsGamertag = !user || !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');

    if (needsGamertag) {
      pendingQueueJoins.set(discordId, queueId);
      try {
        const modal = new ModalBuilder()
          .setCustomId('pq:gamertag_modal')
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
      } catch {
        pendingQueueJoins.delete(discordId);
      }
      return;
    }
  }

  await ensureAccount(interaction);
  await doQueueJoin(interaction, queueId);
}

// ---------------------------------------------------------------------------
// pq:leave:<queueId>
// ---------------------------------------------------------------------------

export async function handleQueueLeave(interaction: ButtonInteraction): Promise<void> {
  const queueId = interaction.customId.split(':')[2];
  const result = leaveQueue(queueId, interaction.user.id);

  if (!result.ok) {
    await interaction.reply({ content: result.error || 'Unable to leave.', ephemeral: true });
    return;
  }

  if (result.queue) await refreshQueueMessage(interaction.client, result.queue);
  await interaction.reply({ content: 'You left the queue.', ephemeral: true });
}

// ---------------------------------------------------------------------------
// Gamertag modal
// ---------------------------------------------------------------------------

export async function handleGamertagModal(interaction: ModalSubmitInteraction): Promise<void> {
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

  // Ensure account
  let user: any = null;
  try { user = await api.getUserByDiscordId(discordId); } catch {}
  if (!user) {
    try { await api.createUser({ discordId, username: getDisplayName(interaction) }); } catch {}
  }

  // Save gamertag
  const platformInfo = getPlatformField(queue.platform);
  if (platformInfo) {
    try {
      await api.updateUserProfile(discordId, { [platformInfo.field]: value });
    } catch {}

    // Plutonium: validate and save plutoId
    if (platformInfo.field === 'plutoniumUsername') {
      const plutoId = await api.resolvePlutoId(value);
      if (!plutoId) {
        await interaction.reply({
          content: `Plutonium username **${value}** was not found. Check your spelling and try again.`,
          ephemeral: true,
        });
        try { await api.updateUserProfile(discordId, { plutoniumUsername: '' }); } catch {}
        return;
      }
      try {
        const u = await api.getUserByDiscordId(discordId);
        if (u?.id) await api.setPlutoId(u.id, plutoId);
      } catch {}
    }
  }

  await doQueueJoin(interaction, queueId);
}

// ---------------------------------------------------------------------------
// Core join logic
// ---------------------------------------------------------------------------

async function doQueueJoin(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  queueId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const displayName = getDisplayName(interaction);

  const result = joinQueue(queueId, {
    discordId: interaction.user.id,
    username: displayName,
    joinedAt: Date.now(),
  });

  if (!result.ok) {
    await interaction.editReply({ content: result.error });
    return;
  }

  await refreshQueueMessage(interaction.client, result.queue);

  if (!result.popped) {
    await interaction.editReply({
      content: `You're in the queue for **${result.queue.title}**. Waiting for one more player.`,
    });
    return;
  }

  // Popped — find available server
  let gameServer: any = null;
  try { gameServer = await api.getAvailableServer(result.queue.id); } catch {}

  if (!gameServer) {
    restorePlayers(result.queue.id, result.player1, result.player2);
    await refreshQueueMessage(interaction.client, result.queue);
    await interaction.editReply({
      content: 'No game servers are available right now. You\'ve been returned to the queue.',
    });
    return;
  }

  // Mark server busy
  try { await api.setServerAvailability(gameServer.id, false); } catch {}

  // Create match thread
  try {
    const threadChannelId = result.queue.channelId;
    const channel = await interaction.client.channels.fetch(threadChannelId);
    if (!channel || channel.type !== ChannelType.GuildText) throw new Error('Channel not found');

    const thread = await (channel as TextChannel).threads.create({
      name: `${result.player1.username} vs ${result.player2.username}`.slice(0, 100),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      type: ChannelType.PublicThread,
    });

    const match = createMatch({
      queue: result.queue,
      threadId: thread.id,
      player1: result.player1,
      player2: result.player2,
      gameServer: { id: gameServer.id, ip: gameServer.ip, port: gameServer.port },
    });

    const msg = await thread.send({
      content: `<@${match.player1.discordId}> <@${match.player2.discordId}>`,
      embeds: [buildReadyUpEmbed(match)],
      components: [buildReadyUpRow(match)],
      allowedMentions: { users: [match.player1.discordId, match.player2.discordId] },
    });

    setReadyMessageId(match.id, msg.id);
    startReadyTimer(interaction.client, match);

    await refreshQueueMessage(interaction.client, result.queue);
    await interaction.editReply({
      content: `Match found! Head to <#${match.threadId}> and ready up.`,
    });
  } catch (err) {
    console.error('[PlutoQueue] Failed to create match thread:', err);
    try { await api.setServerAvailability(gameServer.id, true); } catch {}
    restorePlayers(result.queue.id, result.player1, result.player2);
    await refreshQueueMessage(interaction.client, result.queue);
    await interaction.editReply({ content: 'Failed to create match. You\'ve been returned to the queue.' });
  }
}

// ---------------------------------------------------------------------------
// pq:ready:<matchId>
// ---------------------------------------------------------------------------

export async function handleReadyUp(interaction: ButtonInteraction): Promise<void> {
  const matchId = interaction.customId.split(':')[2];
  const result = readyUp(matchId, interaction.user.id);

  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (!result.bothReady) {
    await interaction.update({
      embeds: [buildReadyUpEmbed(result.match)],
      components: [buildReadyUpRow(result.match)],
    });
    return;
  }

  // Both ready — send connect info
  clearTimer(`pq:ready:${matchId}`);

  const match = result.match;
  await interaction.update({
    content: '',
    embeds: [buildConnectEmbed(match)],
    components: [],
  });

  // Re-ping
  try {
    const thread = await interaction.client.channels.fetch(match.threadId);
    if (thread && 'send' in thread) {
      await thread.send({
        content: `<@${match.player1.discordId}> <@${match.player2.discordId}> — connect to the server!`,
        allowedMentions: { users: [match.player1.discordId, match.player2.discordId] },
      });
    }
  } catch {}

  scheduleThreadDelete(interaction.client, match.threadId);
}
