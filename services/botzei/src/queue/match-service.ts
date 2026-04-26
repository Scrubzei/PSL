/**
 * Match service: state machine for an active match.
 *
 * Lifecycle:
 *   ready_check -> map_selection -> reporting -> (completed | disputed)
 *                                             -> cancelled
 *
 * Ready-up:
 *   - Both players must click Ready Up within the timeout window
 *   - If both ready: transition to map_selection
 *   - If neither ready: cancelled
 *   - If only one ready: ready_forfeit win to the ready player
 *
 * Map selection:
 *   - Both players pick a map within the timeout window
 *   - Same map: that's the final map
 *   - Different maps: 50/50 coin flip
 *   - Neither picks: cancelled
 *   - Only one picks: map_forfeit win to the picker
 *
 * Result resolution:
 *   - Any "I Lost" immediately awards the other player the win (concede)
 *   - Both say "I Won" -> dispute
 */

import { randomUUID } from 'crypto';
import { loadState, saveState } from './storage.js';
import { Match, MatchPlayer, Queue, QueuePlayer, ResultReport } from './types.js';

const READY_UP_DURATION_MS = 3 * 60 * 1000;   // 3 minutes
const MAP_SELECT_DURATION_MS = 5 * 60 * 1000;  // 5 minutes

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export function findMatchById(matchId: string): Match | undefined {
  return loadState().matches.find((m) => m.id === matchId);
}

export function findMatchByThreadId(threadId: string): Match | undefined {
  return loadState().matches.find((m) => m.threadId === threadId);
}

export function findActiveReadyChecks(): Match[] {
  return loadState().matches.filter((m) => m.state === 'ready_check');
}

export function findActiveMapSelections(): Match[] {
  return loadState().matches.filter((m) => m.state === 'map_selection');
}

function getMatchPlayer(match: Match, discordId: string): MatchPlayer | undefined {
  if (match.player1.discordId === discordId) return match.player1;
  if (match.player2.discordId === discordId) return match.player2;
  return undefined;
}

// ---------------------------------------------------------------------------
// Match creation
// ---------------------------------------------------------------------------

export function createMatch(args: {
  queue: Queue;
  threadId: string;
  player1: QueuePlayer;
  player2: QueuePlayer;
  gameServer?: { id: string; ip: string; port: number };
}): Match {
  const state = loadState();
  const match: Match = {
    id: randomUUID(),
    queueId: args.queue.id,
    guildId: args.queue.guildId,
    threadId: args.threadId,
    leaderboardId: args.queue.leaderboardId,
    queueType: args.queue.queueType,
    title: args.queue.title,
    game: args.queue.game,
    platform: args.queue.platform,
    maps: [...args.queue.maps],
    player1: {
      discordId: args.player1.discordId,
      username: args.player1.username,
    },
    player2: {
      discordId: args.player2.discordId,
      username: args.player2.username,
    },
    gameServerId: args.gameServer?.id,
    gameServerIp: args.gameServer?.ip,
    gameServerPort: args.gameServer?.port,
    state: 'ready_check',
    readyUpExpiresAt: Date.now() + READY_UP_DURATION_MS,
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

export function setMapMessageId(matchId: string, messageId: string): void {
  const match = findMatchById(matchId);
  if (!match) return;
  match.mapMessageId = messageId;
  saveState();
}

// ---------------------------------------------------------------------------
// Ready-up
// ---------------------------------------------------------------------------

export type ReadyUpResult =
  | { ok: true; bothReady: false; match: Match }
  | { ok: true; bothReady: true; match: Match }
  | { ok: false; error: string };

export function readyUp(matchId: string, discordId: string): ReadyUpResult {
  const match = findMatchById(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  if (match.state !== 'ready_check') {
    return { ok: false, error: 'Ready-up phase is over.' };
  }

  const player = getMatchPlayer(match, discordId);
  if (!player) {
    return { ok: false, error: 'You are not a participant in this match.' };
  }

  if (player.ready) {
    return { ok: false, error: 'You are already readied up.' };
  }

  player.ready = true;

  if (match.player1.ready && match.player2.ready) {
    match.state = 'map_selection';
    match.mapSelectionExpiresAt = Date.now() + MAP_SELECT_DURATION_MS;
    saveState();
    return { ok: true, bothReady: true, match };
  }

  saveState();
  return { ok: true, bothReady: false, match };
}

export interface ReadyTimeoutResult {
  match: Match;
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

  const winnerId = p1Ready ? match.player1.discordId : match.player2.discordId;
  match.winnerId = winnerId;
  match.state = 'completed';
  match.completionType = 'ready_forfeit';
  match.completedAt = Date.now();
  saveState();
  return { match, outcome: 'forfeit', winnerId };
}

// ---------------------------------------------------------------------------
// Map selection
// ---------------------------------------------------------------------------

export type MapSelectionResult =
  | { ok: true; waiting: true; match: Match; pickedMap: string }
  | {
      ok: true;
      waiting: false;
      match: Match;
      finalMap: string;
      randomized: boolean;
    }
  | { ok: false; error: string };

export function selectMap(
  matchId: string,
  discordId: string,
  mapName: string,
): MapSelectionResult {
  const match = findMatchById(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  if (match.state !== 'map_selection') {
    return { ok: false, error: 'Map selection is not active for this match.' };
  }

  const player = getMatchPlayer(match, discordId);
  if (!player) {
    return { ok: false, error: 'You are not a participant in this match.' };
  }

  if (player.mapSelection) {
    return {
      ok: false,
      error: `You already picked **${player.mapSelection}**.`,
    };
  }

  if (!match.maps.includes(mapName)) {
    return { ok: false, error: 'That map is not in this queue.' };
  }

  player.mapSelection = mapName;

  const other =
    match.player1.discordId === discordId ? match.player2 : match.player1;

  if (!other.mapSelection) {
    saveState();
    return { ok: true, waiting: true, match, pickedMap: mapName };
  }

  // Both have picked — resolve the final map
  let finalMap: string;
  let randomized = false;
  if (match.player1.mapSelection === match.player2.mapSelection) {
    finalMap = match.player1.mapSelection!;
  } else {
    const options = [match.player1.mapSelection!, match.player2.mapSelection!];
    finalMap = options[Math.floor(Math.random() * options.length)];
    randomized = true;
  }

  match.finalMap = finalMap;
  match.state = 'reporting';
  saveState();

  return { ok: true, waiting: false, match, finalMap, randomized };
}

export interface MapTimeoutResult {
  match: Match;
  outcome: 'cancelled' | 'forfeit';
  winnerId?: string;
}

export function resolveMapTimeout(matchId: string): MapTimeoutResult | null {
  const match = findMatchById(matchId);
  if (!match || match.state !== 'map_selection') return null;

  const p1Picked = !!match.player1.mapSelection;
  const p2Picked = !!match.player2.mapSelection;

  if (!p1Picked && !p2Picked) {
    match.state = 'cancelled';
    match.completionType = 'cancelled';
    match.completedAt = Date.now();
    saveState();
    return { match, outcome: 'cancelled' };
  }

  const winnerId = p1Picked ? match.player1.discordId : match.player2.discordId;
  match.winnerId = winnerId;
  match.state = 'completed';
  match.completionType = 'map_forfeit';
  match.completedAt = Date.now();
  saveState();
  return { match, outcome: 'forfeit', winnerId };
}

// ---------------------------------------------------------------------------
// Result reporting
// ---------------------------------------------------------------------------

export type ReportResultResult =
  | { ok: true; kind: 'waiting'; match: Match }
  | { ok: true; kind: 'resolved'; match: Match; winnerId: string }
  | { ok: true; kind: 'disputed'; match: Match }
  | { ok: false; error: string };

export function reportResult(
  matchId: string,
  discordId: string,
  outcome: ResultReport,
): ReportResultResult {
  const match = findMatchById(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  if (match.state === 'completed' || match.state === 'cancelled') {
    return { ok: false, error: 'This match is already finished.' };
  }
  if (match.state === 'disputed') {
    return {
      ok: false,
      error: 'This match is disputed — waiting for a ref to review it.',
    };
  }
  if (match.state !== 'reporting') {
    return { ok: false, error: 'Pick a map first.' };
  }

  const player = getMatchPlayer(match, discordId);
  if (!player) {
    return { ok: false, error: 'You are not a participant in this match.' };
  }

  if (player.resultReport) {
    const label = player.resultReport === 'won' ? 'I Won' : 'I Lost';
    return { ok: false, error: `You already reported **${label}**.` };
  }

  player.resultReport = outcome;

  const other =
    match.player1.discordId === discordId ? match.player2 : match.player1;

  if (outcome === 'lost') {
    match.winnerId = other.discordId;
    match.state = 'completed';
    match.completionType = 'normal';
    match.completedAt = Date.now();
    saveState();
    return { ok: true, kind: 'resolved', match, winnerId: other.discordId };
  }

  if (other.resultReport === 'won') {
    match.state = 'disputed';
    match.completionType = 'disputed';
    saveState();
    return { ok: true, kind: 'disputed', match };
  }

  saveState();
  return { ok: true, kind: 'waiting', match };
}

// ---------------------------------------------------------------------------
// Dispute resolution
// ---------------------------------------------------------------------------

export type ResolveDisputeResult =
  | { ok: true; match: Match; winnerId: string }
  | { ok: false; error: string };

/**
 * Resolve a disputed match by awarding the win to the specified player.
 * Can be called by a participant (conceding) or a ref (forcing).
 */
export function resolveDispute(
  matchId: string,
  winnerId: string,
): ResolveDisputeResult {
  const match = findMatchById(matchId);
  if (!match) return { ok: false, error: 'Match not found.' };

  if (match.state !== 'disputed') {
    return { ok: false, error: 'This match is not disputed.' };
  }

  if (winnerId !== match.player1.discordId && winnerId !== match.player2.discordId) {
    return { ok: false, error: 'Winner must be one of the match participants.' };
  }

  match.winnerId = winnerId;
  match.state = 'completed';
  match.completionType = 'normal';
  match.completedAt = Date.now();
  saveState();

  return { ok: true, match, winnerId };
}
