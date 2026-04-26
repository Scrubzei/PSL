/**
 * Queue + match data model.
 *
 * Match lifecycle:
 *   ready_check -> map_selection -> reporting -> (completed | disputed)
 *                                             -> cancelled (timeout, no-show)
 */

export type MatchState =
  | 'ready_check'
  | 'map_selection'
  | 'reporting'
  | 'completed'
  | 'disputed'
  | 'cancelled';

/** How a match ended. Only set when state is completed or cancelled. */
export type CompletionType =
  | 'normal'             // someone reported a loss
  | 'ready_forfeit'      // one player failed to ready up
  | 'map_forfeit'        // one player failed to pick a map
  | 'disputed'           // both claimed a win (ref will resolve)
  | 'cancelled'          // neither player acted in time

export type ResultReport = 'won' | 'lost';

export interface QueuePlayer {
  discordId: string;
  username: string;
  joinedAt: number;
}

export type QueueType = 'standard' | 'plutonium';

export interface Queue {
  id: string;
  guildId: string;
  channelId: string;
  queueType?: QueueType;
  /** Empty string until the queue embed message has been posted. */
  messageId: string;
  leaderboardId: string;
  /** Channel where match threads are created. Falls back to global config if empty. */
  matchThreadChannelId?: string;
  /** Channels where match results are posted. */
  resultChannelIds?: string[];
  title: string;
  game: string;
  platform: string;
  maps: string[];
  players: QueuePlayer[];
  createdAt: number;
}

export interface MatchPlayer {
  discordId: string;
  username: string;
  /** Whether this player clicked Ready Up. */
  ready?: boolean;
  /** Map this player picked, if any. */
  mapSelection?: string;
  /** Result this player reported, if any. */
  resultReport?: ResultReport;
}

export interface Match {
  id: string;
  queueId: string;
  guildId: string;
  threadId: string;
  leaderboardId: string;
  title: string;
  game: string;
  platform: string;
  maps: string[];
  player1: MatchPlayer;
  player2: MatchPlayer;
  state: MatchState;
  completionType?: CompletionType;
  /** Epoch ms when the ready-up window expires. */
  readyUpExpiresAt?: number;
  /** Epoch ms when the map-selection window expires. */
  mapSelectionExpiresAt?: number;
  /** Discord message ID of the ready-up embed (so timers can edit it). */
  readyMessageId?: string;
  /** Discord message ID of the map-selection embed. */
  mapMessageId?: string;
  /** Queue type that spawned this match. */
  queueType?: QueueType;
  /** Game server assigned to this match (plutonium queues). */
  gameServerId?: string;
  gameServerIp?: string;
  gameServerPort?: number;
  /** Set once both players have picked. */
  finalMap?: string;
  /** Set once the match is resolved (completed only). */
  winnerId?: string;
  createdAt: number;
  completedAt?: number;
}

export interface QueueState {
  queues: Queue[];
  matches: Match[];
}
