/**
 * Plutonium queue data model.
 *
 * The game server IS the match. Its lifecycle:
 *   idle → ready_check → connected → idle
 *
 * No separate match entity needed.
 */

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

export type PlutoServerState = 'idle' | 'ready_check' | 'connected';

export interface PlutoServerPlayer {
  discordId: string;
  username: string;
  ready?: boolean;
}

export interface PlutoGameServer {
  id: string;
  queueId: string;
  name: string;
  ip: string;
  port: number;

  // Match state (populated when not idle)
  state: PlutoServerState;
  player1?: PlutoServerPlayer;
  player2?: PlutoServerPlayer;
  threadId?: string;
  readyMessageId?: string;
  readyUpExpiresAt?: number;
  title?: string;
  game?: string;
  platform?: string;
  assignedAt?: number;
  connectedAt?: number;
}

export interface PlutoQueueState {
  queues: PlutoQueue[];
  servers: PlutoGameServer[];
}
