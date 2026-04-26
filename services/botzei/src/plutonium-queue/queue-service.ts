/**
 * Plutonium queue service: join, leave, pop.
 */

import { randomUUID } from 'crypto';
import { getState, saveState } from './storage.js';
import { PlutoQueue, PlutoQueuePlayer, PlutoMatch } from './types.js';

const QUEUE_SIZE = 2;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findQueueById(queueId: string): PlutoQueue | undefined {
  return getState().queues.find((q) => q.id === queueId);
}

export function findQueueForUser(discordId: string): PlutoQueue | undefined {
  return getState().queues.find((q) =>
    q.players.some((p) => p.discordId === discordId),
  );
}

export function findActiveMatchForUser(discordId: string): PlutoMatch | undefined {
  return getState().matches.find(
    (m) =>
      (m.player1.discordId === discordId || m.player2.discordId === discordId) &&
      m.state === 'ready_check',
  );
}

// ---------------------------------------------------------------------------
// Queue mutations
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
  const state = getState();
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
  state.queues.push(queue);
  saveState();
  return queue;
}

export function setQueueMessageId(queueId: string, messageId: string): void {
  const q = findQueueById(queueId);
  if (!q) return;
  q.messageId = messageId;
  saveState();
}

export function deleteQueue(queueId: string): void {
  const state = getState();
  state.queues = state.queues.filter((q) => q.id !== queueId);
  saveState();
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

  const activeMatch = findActiveMatchForUser(player.discordId);
  if (activeMatch) {
    return { ok: false, queue, error: 'You are already in an active match. Finish it before joining another queue.' };
  }

  queue.players.push(player);
  saveState();
  return { ok: true, queue };
}

/** Pop the two longest-waiting players from a queue. Returns null if < 2 players. */
export function popQueue(queueId: string): { player1: PlutoQueuePlayer; player2: PlutoQueuePlayer } | null {
  const queue = findQueueById(queueId);
  if (!queue || queue.players.length < QUEUE_SIZE) return null;
  const player1 = queue.players.shift()!;
  const player2 = queue.players.shift()!;
  saveState();
  return { player1, player2 };
}

/** Get all queues that have enough players to pop. */
export function getReadyQueues(): PlutoQueue[] {
  return getState().queues.filter((q) => q.players.length >= QUEUE_SIZE);
}

export function leaveQueue(queueId: string, discordId: string): { ok: boolean; queue?: PlutoQueue; error?: string } {
  const queue = findQueueById(queueId);
  if (!queue) return { ok: false, error: 'This queue no longer exists.' };

  const idx = queue.players.findIndex((p) => p.discordId === discordId);
  if (idx === -1) return { ok: false, queue, error: "You aren't in this queue." };

  queue.players.splice(idx, 1);
  saveState();
  return { ok: true, queue };
}

export function restorePlayers(queueId: string, p1: PlutoQueuePlayer, p2: PlutoQueuePlayer): void {
  const queue = findQueueById(queueId);
  if (!queue) return;
  queue.players.unshift(p1, p2);
  saveState();
}
