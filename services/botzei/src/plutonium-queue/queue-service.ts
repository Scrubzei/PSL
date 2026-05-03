/**
 * Plutonium queue service.
 *
 * Queue: join, leave, pop.
 * Server: assign players, ready-up, timeout — the server IS the match.
 */

import { randomUUID } from 'crypto';
import { getState, update } from './storage.js';
import {
  PlutoQueue,
  PlutoQueuePlayer,
  PlutoGameServer,
} from './types.js';

const QUEUE_SIZE = 2;
const READY_UP_DURATION_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Queue lookups
// ---------------------------------------------------------------------------

export function findQueueById(queueId: string): PlutoQueue | undefined {
  return getState().queues.find((q) => q.id === queueId);
}

export function findQueueForUser(discordId: string): PlutoQueue | undefined {
  return getState().queues.find((q) =>
    q.players.some((p) => p.discordId === discordId),
  );
}

// ---------------------------------------------------------------------------
// Server lookups
// ---------------------------------------------------------------------------

export function findServerById(serverId: string): PlutoGameServer | undefined {
  return getState().servers.find((s) => s.id === serverId);
}

export function findActiveServerForUser(discordId: string): PlutoGameServer | undefined {
  return getState().servers.find(
    (s) =>
      s.state === 'ready_check' &&
      (s.player1?.discordId === discordId || s.player2?.discordId === discordId),
  );
}

export function findActiveReadyChecks(): PlutoGameServer[] {
  return getState().servers.filter((s) => s.state === 'ready_check');
}

export function findIdleServerForQueue(queueId: string): PlutoGameServer | undefined {
  return getState().servers.find((s) => s.queueId === queueId && s.state === 'idle');
}

// ---------------------------------------------------------------------------
// Queue CRUD
// ---------------------------------------------------------------------------

export function createQueue(args: {
  guildId: string;
  channelId: string;
  leaderboardId: string;
  title: string;
  game: string;
  platform: string;
  maps: string[];
}): PlutoQueue {
  const queue: PlutoQueue = {
    id: randomUUID(),
    guildId: args.guildId,
    channelId: args.channelId,
    messageId: '',
    leaderboardId: args.leaderboardId,
    title: args.title,
    game: args.game,
    platform: args.platform,
    maps: [...args.maps],
    players: [],
    createdAt: Date.now(),
  };
  update((s) => s.queues.push(queue));
  return queue;
}

export function setQueueMessageId(queueId: string, messageId: string): void {
  const q = findQueueById(queueId);
  if (!q) return;
  update(() => { q.messageId = messageId; });
}

export function deleteQueue(queueId: string): void {
  update((s) => { s.queues = s.queues.filter((q) => q.id !== queueId); });
}

// ---------------------------------------------------------------------------
// Join / Leave / Pop
// ---------------------------------------------------------------------------

export type JoinResult =
  | { ok: true; queue: PlutoQueue }
  | { ok: false; queue?: PlutoQueue; error: string };

export function joinQueue(queueId: string, player: PlutoQueuePlayer): JoinResult {
  const queue = findQueueById(queueId);
  if (!queue) return { ok: false, error: 'This queue no longer exists.' };

  if (queue.players.some((p) => p.discordId === player.discordId)) {
    return { ok: false, queue, error: 'You are already in this queue.' };
  }

  const otherQueue = findQueueForUser(player.discordId);
  if (otherQueue) {
    return { ok: false, queue, error: `You are already in the queue **${otherQueue.title}**. Leave it first.` };
  }

  const activeServer = findActiveServerForUser(player.discordId);
  if (activeServer) {
    return { ok: false, queue, error: 'You are already in an active match. Finish it before joining another queue.' };
  }

  update(() => { queue.players.push(player); });
  return { ok: true, queue };
}

export function popQueue(queueId: string): { player1: PlutoQueuePlayer; player2: PlutoQueuePlayer } | null {
  const queue = findQueueById(queueId);
  if (!queue || queue.players.length < QUEUE_SIZE) return null;
  let player1!: PlutoQueuePlayer;
  let player2!: PlutoQueuePlayer;
  update(() => {
    player1 = queue.players.shift()!;
    player2 = queue.players.shift()!;
  });
  return { player1, player2 };
}

export function getReadyQueues(): PlutoQueue[] {
  return getState().queues.filter((q) => q.players.length >= QUEUE_SIZE);
}

export function leaveQueue(queueId: string, discordId: string): { ok: boolean; queue?: PlutoQueue; error?: string } {
  const queue = findQueueById(queueId);
  if (!queue) return { ok: false, error: 'This queue no longer exists.' };

  const idx = queue.players.findIndex((p) => p.discordId === discordId);
  if (idx === -1) return { ok: false, queue, error: "You aren't in this queue." };

  update(() => { queue.players.splice(idx, 1); });
  return { ok: true, queue };
}

export function restorePlayers(queueId: string, p1: PlutoQueuePlayer, p2: PlutoQueuePlayer): void {
  const queue = findQueueById(queueId);
  if (!queue) return;
  update(() => { queue.players.unshift(p1, p2); });
}

// ---------------------------------------------------------------------------
// Server lifecycle
// ---------------------------------------------------------------------------

export function registerServer(data: { id: string; queueId: string; name: string; ip: string; port: number }): PlutoGameServer {
  const state = getState();
  let server = state.servers.find((s) => s.id === data.id);
  if (server) {
    update(() => { Object.assign(server!, data); });
  } else {
    server = { ...data, state: 'idle' };
    update((s) => { s.servers.push(server!); });
  }
  return server;
}

export function assignPlayers(
  serverId: string,
  queue: PlutoQueue,
  player1: PlutoQueuePlayer,
  player2: PlutoQueuePlayer,
  threadId: string,
): PlutoGameServer | null {
  const server = findServerById(serverId);
  if (!server || server.state !== 'idle') return null;

  update(() => {
    server!.state = 'ready_check';
    server!.player1 = { discordId: player1.discordId, username: player1.username };
    server!.player2 = { discordId: player2.discordId, username: player2.username };
    server!.threadId = threadId;
    server!.readyUpExpiresAt = Date.now() + READY_UP_DURATION_MS;
    server!.title = queue.title;
    server!.game = queue.game;
    server!.platform = queue.platform;
    server!.assignedAt = Date.now();
    server!.connectedAt = undefined;
  });
  return server;
}

export function setReadyMessageId(serverId: string, messageId: string): void {
  const server = findServerById(serverId);
  if (!server) return;
  update(() => { server!.readyMessageId = messageId; });
}

// ---------------------------------------------------------------------------
// Ready-up
// ---------------------------------------------------------------------------

export type ReadyUpResult =
  | { ok: true; bothReady: false; server: PlutoGameServer }
  | { ok: true; bothReady: true; server: PlutoGameServer }
  | { ok: false; error: string };

export function readyUp(serverId: string, discordId: string): ReadyUpResult {
  const server = findServerById(serverId);
  if (!server) return { ok: false, error: 'Server not found.' };
  if (server.state !== 'ready_check') return { ok: false, error: 'Ready-up phase is over.' };

  const player = server.player1?.discordId === discordId ? server.player1
    : server.player2?.discordId === discordId ? server.player2
    : undefined;
  if (!player) return { ok: false, error: 'You are not a participant in this match.' };
  if (player.ready) return { ok: false, error: 'You are already readied up.' };

  if (server.player1?.ready || server.player2?.ready) {
    // Second player readying — both ready
    update(() => {
      player.ready = true;
      server!.state = 'connected';
      server!.connectedAt = Date.now();
    });
    return { ok: true, bothReady: true, server };
  }

  update(() => { player.ready = true; });
  return { ok: true, bothReady: false, server };
}

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

export interface ReadyTimeoutResult {
  server: PlutoGameServer;
  outcome: 'cancelled' | 'forfeit';
  winnerId?: string;
}

export function resolveReadyTimeout(serverId: string): ReadyTimeoutResult | null {
  const server = findServerById(serverId);
  if (!server || server.state !== 'ready_check') return null;

  const p1Ready = !!server.player1?.ready;
  const p2Ready = !!server.player2?.ready;

  if (!p1Ready && !p2Ready) {
    resetServer(server);
    return { server, outcome: 'cancelled' };
  }

  const winnerId = p1Ready ? server.player1!.discordId : server.player2!.discordId;
  resetServer(server);
  return { server, outcome: 'forfeit', winnerId };
}

export function resetServer(server: PlutoGameServer): void {
  update(() => {
    server.state = 'idle';
    server.player1 = undefined;
    server.player2 = undefined;
    server.threadId = undefined;
    server.readyMessageId = undefined;
    server.readyUpExpiresAt = undefined;
    server.title = undefined;
    server.game = undefined;
    server.platform = undefined;
    server.assignedAt = undefined;
    server.connectedAt = undefined;
  });
}
