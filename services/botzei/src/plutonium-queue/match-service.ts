/**
 * Plutonium match service: ready-up only.
 *
 * No map selection, no result reporting, no disputes.
 */

import { randomUUID } from 'crypto';
import { getState, saveState } from './storage.js';
import { PlutoMatch, PlutoMatchPlayer, PlutoQueue, PlutoQueuePlayer } from './types.js';

const READY_UP_DURATION_MS = 3 * 60 * 1000;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findMatchById(matchId: string): PlutoMatch | undefined {
  return getState().matches.find((m) => m.id === matchId);
}

export function findActiveReadyChecks(): PlutoMatch[] {
  return getState().matches.filter((m) => m.state === 'ready_check');
}

function getMatchPlayer(match: PlutoMatch, discordId: string): PlutoMatchPlayer | undefined {
  if (match.player1.discordId === discordId) return match.player1;
  if (match.player2.discordId === discordId) return match.player2;
  return undefined;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createMatch(args: {
  queue: PlutoQueue;
  threadId: string;
  player1: PlutoQueuePlayer;
  player2: PlutoQueuePlayer;
  gameServer: { id: string; ip: string; port: number };
}): PlutoMatch {
  const state = getState();
  const match: PlutoMatch = {
    id: randomUUID(),
    queueId: args.queue.id,
    guildId: args.queue.guildId,
    threadId: args.threadId,
    title: args.queue.title,
    game: args.queue.game,
    platform: args.queue.platform,
    player1: { discordId: args.player1.discordId, username: args.player1.username },
    player2: { discordId: args.player2.discordId, username: args.player2.username },
    state: 'ready_check',
    readyUpExpiresAt: Date.now() + READY_UP_DURATION_MS,
    gameServerId: args.gameServer.id,
    gameServerIp: args.gameServer.ip,
    gameServerPort: args.gameServer.port,
    createdAt: Date.now(),
  };
  state.matches.push(match);
  saveState();
  return match;
}

export function setReadyMessageId(matchId: string, messageId: string): void {
  const match = findMatchById(matchId);
  if (!match) return;
  match.readyMessageId = messageId;
  saveState();
}

// ---------------------------------------------------------------------------
// Ready-up
// ---------------------------------------------------------------------------

export type ReadyUpResult =
  | { ok: true; bothReady: false; match: PlutoMatch }
  | { ok: true; bothReady: true; match: PlutoMatch }
  | { ok: false; error: string };

export function readyUp(matchId: string, discordId: string): ReadyUpResult {
  const match = findMatchById(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };
  if (match.state !== 'ready_check') return { ok: false, error: 'Ready-up phase is over.' };

  const player = getMatchPlayer(match, discordId);
  if (!player) return { ok: false, error: 'You are not a participant in this match.' };
  if (player.ready) return { ok: false, error: 'You are already readied up.' };

  player.ready = true;

  if (match.player1.ready && match.player2.ready) {
    match.state = 'connected';
    match.completionType = 'connected';
    match.completedAt = Date.now();
    saveState();
    return { ok: true, bothReady: true, match };
  }

  saveState();
  return { ok: true, bothReady: false, match };
}

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

export interface ReadyTimeoutResult {
  match: PlutoMatch;
  outcome: 'cancelled' | 'forfeit';
  winnerId?: string;
}

export function resolveReadyTimeout(matchId: string): ReadyTimeoutResult | null {
  const match = findMatchById(matchId);
  if (!match || match.state !== 'ready_check') return null;

  const p1Ready = !!match.player1.ready;
  const p2Ready = !!match.player2.ready;

  if (!p1Ready && !p2Ready) {
    match.state = 'cancelled';
    match.completionType = 'cancelled';
    match.completedAt = Date.now();
    saveState();
    return { match, outcome: 'cancelled' };
  }

  // One player ready — they get the win by forfeit
  const winnerId = p1Ready ? match.player1.discordId : match.player2.discordId;
  match.state = 'cancelled';
  match.completionType = 'ready_forfeit';
  match.completedAt = Date.now();
  saveState();
  return { match, outcome: 'forfeit', winnerId };
}
