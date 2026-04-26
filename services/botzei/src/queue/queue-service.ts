/**
 * Queue service: pure state transitions. No Discord.js imports.
 *
 * All functions are synchronous and operate on the in-memory state loaded
 * from storage. They save on every mutation.
 */

import { randomUUID } from 'crypto';
import { loadState, saveState } from './storage.js';
import { Queue, QueuePlayer, Match } from './types.js';
import { QUEUE_CONFIG } from './config.js';

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findQueueById(queueId: string): Queue | undefined {
  return loadState().queues.find((q) => q.id === queueId);
}

export function findQueueByMessageId(messageId: string): Queue | undefined {
  return loadState().queues.find((q) => q.messageId === messageId);
}

/** Returns a queue the user is currently in, if any. */
export function findQueueForUser(discordId: string): Queue | undefined {
  return loadState().queues.find((q) =>
    q.players.some((p) => p.discordId === discordId),
  );
}

/** Returns a non-completed match the user is currently in, if any. */
export function findActiveMatchForUser(discordId: string): Match | undefined {
  return loadState().matches.find(
    (m) =>
      (m.player1.discordId === discordId ||
        m.player2.discordId === discordId) &&
      m.state !== 'completed' &&
      m.state !== 'disputed' &&
      m.state !== 'cancelled',
  );
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export function createQueue(args: {
  guildId: string;
  channelId: string;
  leaderboardId: string;
  queueType?: string;
  matchThreadChannelId?: string;
  resultChannelIds?: string[];
  title: string;
  game: string;
  platform: string;
  maps: string[];
}): Queue {
  const state = loadState();
  const queue: Queue = {
    id: randomUUID(),
    guildId: args.guildId,
    channelId: args.channelId,
    messageId: '',
    queueType: (args.queueType as any) || 'standard',
    leaderboardId: args.leaderboardId,
    matchThreadChannelId: args.matchThreadChannelId || undefined,
    resultChannelIds: args.resultChannelIds?.length ? args.resultChannelIds : undefined,
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

export function updateQueue(
  queueId: string,
  updates: { title?: string; channelId?: string; matchThreadChannelId?: string; resultChannelIds?: string[]; maps?: string[] },
): Queue | null {
  const q = findQueueById(queueId);
  if (!q) return null;
  if (updates.title !== undefined) q.title = updates.title;
  if (updates.channelId !== undefined) q.channelId = updates.channelId;
  if (updates.matchThreadChannelId !== undefined) q.matchThreadChannelId = updates.matchThreadChannelId;
  if (updates.resultChannelIds !== undefined) q.resultChannelIds = updates.resultChannelIds.length ? updates.resultChannelIds : undefined;
  if (updates.maps !== undefined) q.maps = updates.maps;
  saveState();
  return q;
}

export function deleteQueue(queueId: string): void {
  const state = loadState();
  state.queues = state.queues.filter((q) => q.id !== queueId);
  saveState();
}

export type JoinResult =
  | { ok: true; queue: Queue; popped: false }
  | { ok: true; queue: Queue; popped: true; player1: QueuePlayer; player2: QueuePlayer }
  | { ok: false; queue?: Queue; error: string };

export function joinQueue(queueId: string, player: QueuePlayer): JoinResult {
  const queue = findQueueById(queueId);
  if (!queue) return { ok: false, error: 'This queue no longer exists.' };

  if (queue.players.some((p) => p.discordId === player.discordId)) {
    return { ok: false, queue, error: 'You are already in this queue.' };
  }

  const otherQueue = findQueueForUser(player.discordId);

  if (otherQueue) {
    return {
      ok: false,
      queue,
      error: `You are already in the queue **${otherQueue.title}**. Leave it first.`,
    };
  }

  const activeMatch = findActiveMatchForUser(player.discordId);

  if (activeMatch) {
    return {
      ok: false,
      queue,
      error: 'You are already in an active match. Finish it before joining another queue.',
    };
  }

  queue.players.push(player);

  if (queue.players.length >= QUEUE_CONFIG.QUEUE_SIZE) {
    // Pop: take the first two, remove them from the queue, return them.
    const player1 = queue.players.shift()!;
    const player2 = queue.players.shift()!;
    saveState();
    return { ok: true, queue, popped: true, player1, player2 };
  }

  saveState();
  return { ok: true, queue, popped: false };
}

export interface LeaveResult {
  ok: boolean;
  queue?: Queue;
  error?: string;
}

export function leaveQueue(queueId: string, discordId: string): LeaveResult {
  const queue = findQueueById(queueId);
  if (!queue) return { ok: false, error: 'This queue no longer exists.' };

  const idx = queue.players.findIndex((p) => p.discordId === discordId);
  if (idx === -1) {
    return { ok: false, queue, error: "You aren't in this queue." };
  }

  queue.players.splice(idx, 1);
  saveState();
  return { ok: true, queue };
}

/** Restore two popped players to the front of a queue (used on match creation failure). */
export function restorePlayers(
  queueId: string,
  player1: QueuePlayer,
  player2: QueuePlayer,
): void {
  const queue = findQueueById(queueId);
  if (!queue) return;
  queue.players.unshift(player1, player2);
  saveState();
}
