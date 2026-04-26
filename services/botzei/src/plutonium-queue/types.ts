/**
 * Plutonium queue data model.
 *
 * Lifecycle: ready_check -> connected | cancelled
 *
 * No map selection, no result reporting, no disputes.
 * The game server handles everything after players connect.
 */

export type PlutoMatchState = 'ready_check' | 'connected' | 'cancelled';

export type PlutoCompletionType = 'connected' | 'ready_forfeit' | 'cancelled';

export interface PlutoQueuePlayer {
  discordId: string;
  username: string;
  joinedAt: number;
}

export interface PlutoQueue {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  leaderboardId: string;
  title: string;
  game: string;
  platform: string;
  maps: string[];
  players: PlutoQueuePlayer[];
  createdAt: number;
}

export interface PlutoMatchPlayer {
  discordId: string;
  username: string;
  ready?: boolean;
}

export interface PlutoMatch {
  id: string;
  queueId: string;
  guildId: string;
  threadId: string;
  title: string;
  game: string;
  platform: string;
  player1: PlutoMatchPlayer;
  player2: PlutoMatchPlayer;
  state: PlutoMatchState;
  completionType?: PlutoCompletionType;
  readyUpExpiresAt?: number;
  readyMessageId?: string;
  gameServerId?: string;
  gameServerIp?: string;
  gameServerPort?: number;
  createdAt: number;
  completedAt?: number;
}

export interface PlutoQueueState {
  queues: PlutoQueue[];
  matches: PlutoMatch[];
}
