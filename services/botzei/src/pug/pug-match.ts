import type { PugPlayer } from './pug-queue.js';

export type MatchPhase = 'READY_UP' | 'MAP_PICK' | 'IN_PROGRESS' | 'REPORTING' | 'DONE';

export const MATCHES_CHANNEL_ID = '1480119571037028423';
export const RESULTS_CHANNEL_ID = '1480119106975039509';

export interface PugMatch {
  id: number;
  queueChannelId: string;
  queueName: string;
  leaderboardId: string;
  maps: string[];
  player1: PugPlayer;
  player2: PugPlayer;
  phase: MatchPhase;
  messageId: string | null; // current embed message ID in matches channel
  player1Ready: boolean;
  player2Ready: boolean;
  readyDeadline: number; // unix timestamp (seconds)
  readyTimeout: ReturnType<typeof setTimeout> | null;
  player1MapPick: string | null;
  player2MapPick: string | null;
  chosenMap: string | null;
  reportedWinner: string | null;
  reportedBy: string | null;
}

const matches = new Map<number, PugMatch>();

let matchCounter = 0;

export function createMatch(
  queueChannelId: string,
  queueName: string,
  leaderboardId: string,
  maps: string[],
  player1: PugPlayer,
  player2: PugPlayer,
): PugMatch {
  matchCounter++;
  const match: PugMatch = {
    id: matchCounter,
    queueChannelId,
    queueName,
    leaderboardId,
    maps,
    player1,
    player2,
    phase: 'READY_UP',
    messageId: null,
    player1Ready: false,
    player2Ready: false,
    readyDeadline: Math.floor(Date.now() / 1000) + 300,
    readyTimeout: null,
    player1MapPick: null,
    player2MapPick: null,
    chosenMap: null,
    reportedWinner: null,
    reportedBy: null,
  };
  matches.set(match.id, match);
  return match;
}

export function getMatch(id: number): PugMatch | undefined {
  return matches.get(id);
}

export function getActiveMatchForPlayer(discordId: string): PugMatch | undefined {
  for (const match of matches.values()) {
    if (match.phase === 'DONE') continue;
    if (match.player1.discordId === discordId || match.player2.discordId === discordId) {
      return match;
    }
  }
  return undefined;
}

export function deleteMatch(id: number): void {
  const match = matches.get(id);
  if (match?.readyTimeout) clearTimeout(match.readyTimeout);
  matches.delete(id);
}

export function setReady(id: number, discordId: string): { alreadyReady: boolean; bothReady: boolean } {
  const match = matches.get(id);
  if (!match) return { alreadyReady: false, bothReady: false };

  if (discordId === match.player1.discordId) {
    if (match.player1Ready) return { alreadyReady: true, bothReady: false };
    match.player1Ready = true;
  } else if (discordId === match.player2.discordId) {
    if (match.player2Ready) return { alreadyReady: true, bothReady: false };
    match.player2Ready = true;
  }

  const bothReady = match.player1Ready && match.player2Ready;
  if (bothReady && match.readyTimeout) {
    clearTimeout(match.readyTimeout);
    match.readyTimeout = null;
  }

  return { alreadyReady: false, bothReady };
}

export function setMapPick(id: number, discordId: string, map: string): { alreadyPicked: boolean; bothPicked: boolean; chosenMap: string | null } {
  const match = matches.get(id);
  if (!match) return { alreadyPicked: false, bothPicked: false, chosenMap: null };

  if (discordId === match.player1.discordId) {
    if (match.player1MapPick) return { alreadyPicked: true, bothPicked: false, chosenMap: null };
    match.player1MapPick = map;
  } else if (discordId === match.player2.discordId) {
    if (match.player2MapPick) return { alreadyPicked: true, bothPicked: false, chosenMap: null };
    match.player2MapPick = map;
  }

  const bothPicked = !!match.player1MapPick && !!match.player2MapPick;

  if (bothPicked) {
    if (match.player1MapPick === match.player2MapPick) {
      match.chosenMap = match.player1MapPick!;
    } else {
      match.chosenMap = Math.random() < 0.5 ? match.player1MapPick! : match.player2MapPick!;
    }
    match.phase = 'IN_PROGRESS';
  }

  return { alreadyPicked: false, bothPicked, chosenMap: match.chosenMap };
}

export function reportResult(id: number, reporterDiscordId: string, winnerDiscordId: string): { reported: boolean; confirmed: boolean } {
  const match = matches.get(id);
  if (!match) return { reported: false, confirmed: false };

  if (!match.reportedWinner) {
    match.reportedWinner = winnerDiscordId;
    match.reportedBy = reporterDiscordId;
    match.phase = 'REPORTING';
    return { reported: true, confirmed: false };
  }

  if (match.reportedWinner === winnerDiscordId && reporterDiscordId !== match.reportedBy) {
    match.phase = 'DONE';
    return { reported: true, confirmed: true };
  }

  return { reported: false, confirmed: false };
}

export function resetForRematch(id: number): PugMatch | undefined {
  const match = matches.get(id);
  if (!match) return undefined;

  match.phase = 'MAP_PICK';
  match.player1MapPick = null;
  match.player2MapPick = null;
  match.chosenMap = null;
  match.reportedWinner = null;
  match.reportedBy = null;
  match.messageId = null;

  return match;
}
