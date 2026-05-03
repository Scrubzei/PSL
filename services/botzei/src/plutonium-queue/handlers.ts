/**
 * Plutonium queue button handlers.
 *
 * Custom ID scheme (prefixed with pq: to avoid conflicts with standard queue):
 *   pq:join:<queueId>
 *   pq:leave:<queueId>
 *   pq:ready:<serverId>
 */

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
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
  getReadyQueues,
  popQueue,
  findServerById,
  findActiveReadyChecks,
  assignPlayers,
  setReadyMessageId,
  readyUp,
  resolveReadyTimeout,
  resetServer,
  registerServer,
} from './queue-service.js';
import { PlutoGameServer, PlutoQueue } from './types.js';
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

function startReadyTimer(client: Client, server: PlutoGameServer): void {
  const key = `pq:ready:${server.id}`;
  clearTimer(key);
  const delay = Math.max(0, (server.readyUpExpiresAt ?? 0) - Date.now());
  const timer = setTimeout(() => {
    activeTimers.delete(key);
    onReadyExpired(client, server.id).catch((err) =>
      console.error('[PlutoQueue] Ready timeout error:', err),
    );
  }, delay);
  activeTimers.set(key, timer);
}

async function onReadyExpired(client: Client, serverId: string): Promise<void> {
  const server = findServerById(serverId);
  if (!server || server.state !== 'ready_check') return;

  // Capture info before reset clears it
  const threadId = server.threadId;
  const readyMessageId = server.readyMessageId;
  const p1 = server.player1 ? { ...server.player1 } : undefined;
  const p2 = server.player2 ? { ...server.player2 } : undefined;

  // Release game server in DB (clear match + set available)
  try { await api.clearServerMatch(server.id); } catch {}

  const result = resolveReadyTimeout(serverId);
  if (!result) return;

  try {
    if (!threadId) return;
    const thread = await client.channels.fetch(threadId);
    if (!thread || !('send' in thread)) return;

    if (readyMessageId) {
      try {
        const msg = await (thread as any).messages.fetch(readyMessageId);
        // Use captured player data since server is now reset
        const snapshot = { ...server, player1: p1, player2: p2 } as PlutoGameServer;
        if (result.outcome === 'cancelled') {
          await msg.edit({ embeds: [buildReadyCancelledEmbed(snapshot)], components: [] });
        } else {
          await msg.edit({ embeds: [buildReadyForfeitEmbed(snapshot, result.winnerId!)], components: [] });
        }
      } catch {}
    }

    if (result.outcome === 'cancelled') {
      await thread.send({ content: '❌ Match cancelled — neither player readied up.' });
    } else {
      const winner = result.winnerId === p1?.discordId ? p1 : p2;
      const noShow = result.winnerId === p1?.discordId ? p2 : p1;
      await thread.send({
        content: `🏆 **${winner?.username}** wins by forfeit. **${noShow?.username}** failed to ready up.`,
      });
    }

    scheduleThreadDelete(client, threadId);
  } catch (err) {
    console.error('[PlutoQueue] Failed to resolve ready timeout:', err);
  }
}

export function initPlutoTimers(client: Client): void {
  const checks = findActiveReadyChecks();
  if (checks.length === 0) return;
  console.log(`[PlutoQueue] Resuming ${checks.length} ready-check timer(s)`);
  for (const server of checks) {
    startReadyTimer(client, server);
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
// Core join logic (just adds to queue — popping is handled by background loop)
// ---------------------------------------------------------------------------

async function doQueueJoin(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  queueId: string,
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  const result = joinQueue(queueId, {
    discordId: interaction.user.id,
    username: getDisplayName(interaction),
    joinedAt: Date.now(),
  });

  if (!result.ok) {
    await interaction.editReply({ content: result.error });
    return;
  }

  await refreshQueueMessage(interaction.client, result.queue);
  await interaction.editReply({
    content: `You're in the queue for **${result.queue.title}**. You'll be matched when a server is available.`,
  });
}

// ---------------------------------------------------------------------------
// Background queue poller — checks every 5 seconds
// ---------------------------------------------------------------------------

let pollerClient: Client | null = null;
let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startQueuePoller(client: Client): void {
  pollerClient = client;
  if (pollerInterval) return;
  pollerInterval = setInterval(() => {
    processReadyQueues().catch((err) =>
      console.error('[PlutoQueue] Poller error:', err),
    );
  }, 5000);
  console.log('[PlutoQueue] Background poller started (5s interval)');
}

async function processReadyQueues(): Promise<void> {
  if (!pollerClient) return;
  const readyQueues = getReadyQueues();

  for (const queue of readyQueues) {
    // Ask the DB for an available server — it's the source of truth
    let apiServer: any = null;

    try { apiServer = await api.getAvailableServer(queue.id); } catch {}

    if (!apiServer) continue;

    const server = registerServer({
      id: apiServer.id,
      queueId: apiServer.queueId,
      name: apiServer.name,
      ip: apiServer.ip,
      port: apiServer.port,
    });

    // Pop the two longest-waiting players
    const popped = popQueue(queue.id);

    if (!popped) continue;

    // Mark server busy in DB
    try { await api.setServerAvailability(server.id, false); } catch {}

    // Create match thread and assign players to server
    try {
      const channel = await pollerClient.channels.fetch(queue.channelId);
      if (!channel || channel.type !== ChannelType.GuildText) throw new Error('Channel not found');

      const thread = await (channel as TextChannel).threads.create({
        name: `${popped.player1.username} vs ${popped.player2.username}`.slice(0, 100),
        autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
        type: ChannelType.PublicThread,
      });

      const assigned = assignPlayers(server.id, queue, popped.player1, popped.player2, thread.id);
      if (!assigned) throw new Error('Failed to assign players to server');

      const msg = await thread.send({
        content: `<@${assigned.player1!.discordId}> <@${assigned.player2!.discordId}>`,
        embeds: [buildReadyUpEmbed(assigned)],
        components: [buildReadyUpRow(assigned)],
        allowedMentions: { users: [assigned.player1!.discordId, assigned.player2!.discordId] },
      });

      setReadyMessageId(assigned.id, msg.id);
      startReadyTimer(pollerClient, assigned);
      await refreshQueueMessage(pollerClient, queue);
    } catch (err) {
      console.error('[PlutoQueue] Poller failed to create match:', err);
      // Release server and restore players
      try { await api.setServerAvailability(server.id, true); } catch {}
      resetServer(server);
      restorePlayers(queue.id, popped.player1, popped.player2);
    }
  }
}

// ---------------------------------------------------------------------------
// pq:ready:<serverId>
// ---------------------------------------------------------------------------

export async function handleReadyUp(interaction: ButtonInteraction): Promise<void> {
  const serverId = interaction.customId.split(':')[2];
  const result = readyUp(serverId, interaction.user.id);

  if (!result.ok) {
    await interaction.reply({ content: result.error, ephemeral: true });
    return;
  }

  if (!result.bothReady) {
    await interaction.update({
      embeds: [buildReadyUpEmbed(result.server)],
      components: [buildReadyUpRow(result.server)],
    });
    return;
  }

  // Both ready — send connect info
  clearTimer(`pq:ready:${serverId}`);

  const server = result.server;
  await interaction.update({
    content: '',
    embeds: [buildConnectEmbed(server)],
    components: [],
  });

  // Push match data to the game server row in DB
  try {
    const [u1, u2] = await Promise.all([
      api.getUserByDiscordId(server.player1!.discordId),
      api.getUserByDiscordId(server.player2!.discordId),
    ]);
    const queue = findQueueById(server.queueId);
    await api.assignServerMatch(server.id, {
      player1PlutoId: u1?.plutoId ?? '',
      player2PlutoId: u2?.plutoId ?? '',
      player1DiscordId: server.player1!.discordId,
      player2DiscordId: server.player2!.discordId,
      player1PlutoUsername: u1?.plutoniumUsername ?? server.player1!.username,
      player2PlutoUsername: u2?.plutoniumUsername ?? server.player2!.username,
      threadId: server.threadId,
      leaderboardId: queue?.leaderboardId,
    });
  } catch (err) {
    console.error('[PlutoQueue] Failed to assign match to game server:', err);
  }

  // Re-ping
  try {
    const thread = await interaction.client.channels.fetch(server.threadId!);
    if (thread && 'send' in thread) {
      await thread.send({
        content: `<@${server.player1!.discordId}> <@${server.player2!.discordId}> — connect to the server!`,
        allowedMentions: { users: [server.player1!.discordId, server.player2!.discordId] },
      });
    }
  } catch {}

  scheduleThreadDelete(interaction.client, server.threadId!);
}
