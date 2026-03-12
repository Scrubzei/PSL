import { GameServerConfig } from './game-servers.config.js';

// --- Types ---

export interface QueuedPlayer {
  discordId: string;
  username: string;
  plutoId: string;
  joinedAt: number;
}

export interface GameServer {
  id: string;
  name: string;
  ip: string;
  port: number;
  status: 'AVAILABLE' | 'IN_USE';
  currentMatchId?: string;
}

export interface PendingMatch {
  id: string;
  player1: QueuedPlayer;
  player2: QueuedPlayer;
  player1Accepted: boolean;
  player2Accepted: boolean;
  gameServer: GameServer | null;
  channelId: string;
  messageId?: string;
  dm1MessageId?: string;
  dm2MessageId?: string;
  timeout: ReturnType<typeof setTimeout>;
  createdAt: number;
}

export type AddToQueueResult =
  | { matched: false; position: number }
  | { matched: true; match: PendingMatch };

export type AcceptResult =
  | { bothAccepted: true; server: GameServer; match: PendingMatch }
  | { bothAccepted: false }
  | { error: string };

export type DeclineResult =
  | { confirmer: QueuedPlayer | null; decliner: QueuedPlayer }
  | { error: string };

// --- Constants ---

const CONFIRM_TIMEOUT_MS = 150_000; // 2.5 minutes
const DODGE_COOLDOWN_MS = 300_000;  // 5 minutes

// --- State ---

const queue: QueuedPlayer[] = [];
const pendingMatches = new Map<string, PendingMatch>();
const dodgeCooldowns = new Map<string, number>();
const gameServers: GameServer[] = [];

// Callback for when a match times out (set by the Discord-side code)
let onMatchTimeout: ((match: PendingMatch, dodgers: QueuedPlayer[], confirmers: QueuedPlayer[]) => void) | null = null;

// --- Init ---

export function initGameServers(configs: GameServerConfig[]): void {
  gameServers.length = 0;
  for (const config of configs) {
    gameServers.push({
      ...config,
      status: 'AVAILABLE',
    });
  }
  console.log(`[Queue] Initialized ${gameServers.length} game server(s)`);
}

export function setTimeoutHandler(
  handler: (match: PendingMatch, dodgers: QueuedPlayer[], confirmers: QueuedPlayer[]) => void,
): void {
  onMatchTimeout = handler;
}

// --- Queue Operations ---

export function addToQueue(player: QueuedPlayer, channelId: string): AddToQueueResult | { error: string } {
  // Pre-checks
  if (isInQueue(player.discordId)) {
    return { error: 'You are already in the queue.' };
  }

  const existingMatchId = getPlayerPendingMatchId(player.discordId);
  if (existingMatchId) {
    return { error: 'You have a pending match. Check your DMs!' };
  }

  const cooldownRemaining = getCooldownRemaining(player.discordId);
  if (cooldownRemaining > 0) {
    const expiresAt = Math.floor((Date.now() + cooldownRemaining) / 1000);
    return { error: `You're on cooldown. You can queue again <t:${expiresAt}:R>.` };
  }

  // Check if a server is available before matching
  const serverAvailable = getAvailableServer() !== null;

  // Add to queue
  queue.push(player);

  // Check for a match
  if (queue.length >= 2 && serverAvailable) {
    const player1 = queue.shift()!;
    const player2 = queue.shift()!;
    const match = createPendingMatch(player1, player2, channelId);
    return { matched: true, match };
  }

  return { matched: false, position: queue.length };
}

export function removeFromQueue(discordId: string): boolean {
  const index = queue.findIndex(p => p.discordId === discordId);
  if (index === -1) return false;
  queue.splice(index, 1);
  return true;
}

export function isInQueue(discordId: string): boolean {
  return queue.some(p => p.discordId === discordId);
}

export function getPlayerPendingMatchId(discordId: string): string | null {
  for (const [matchId, match] of pendingMatches) {
    if (match.player1.discordId === discordId || match.player2.discordId === discordId) {
      return matchId;
    }
  }
  return null;
}

export function getQueueSize(): number {
  return queue.length;
}

export function getPendingMatch(matchId: string): PendingMatch | undefined {
  return pendingMatches.get(matchId);
}

// --- Match Operations ---

function createPendingMatch(player1: QueuedPlayer, player2: QueuedPlayer, channelId: string): PendingMatch {
  const matchId = `qm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const timeout = setTimeout(() => {
    handleMatchTimeout(matchId);
  }, CONFIRM_TIMEOUT_MS);

  const match: PendingMatch = {
    id: matchId,
    player1,
    player2,
    player1Accepted: false,
    player2Accepted: false,
    gameServer: null,
    channelId,
    timeout,
    createdAt: Date.now(),
  };

  pendingMatches.set(matchId, match);
  return match;
}

export function acceptMatch(matchId: string, discordId: string): AcceptResult {
  const match = pendingMatches.get(matchId);
  if (!match) return { error: 'This match has expired.' };

  const isPlayer1 = match.player1.discordId === discordId;
  const isPlayer2 = match.player2.discordId === discordId;
  if (!isPlayer1 && !isPlayer2) return { error: "This isn't your match." };

  // Mark accepted
  if (isPlayer1) match.player1Accepted = true;
  if (isPlayer2) match.player2Accepted = true;

  // Check if both accepted
  if (match.player1Accepted && match.player2Accepted) {
    clearTimeout(match.timeout);

    const server = assignServer(matchId);
    if (!server) {
      // No servers available — re-queue both to front
      pendingMatches.delete(matchId);
      queue.unshift(match.player2);
      queue.unshift(match.player1);
      return { error: 'All servers are currently in use. You have been placed back at the front of the queue.' };
    }

    match.gameServer = server;
    pendingMatches.delete(matchId);
    return { bothAccepted: true, server, match };
  }

  return { bothAccepted: false };
}

export function declineMatch(matchId: string, discordId: string): DeclineResult {
  const match = pendingMatches.get(matchId);
  if (!match) return { error: 'This match has expired.' };

  const isPlayer1 = match.player1.discordId === discordId;
  const isPlayer2 = match.player2.discordId === discordId;
  if (!isPlayer1 && !isPlayer2) return { error: "This isn't your match." };

  clearTimeout(match.timeout);
  pendingMatches.delete(matchId);

  const decliner = isPlayer1 ? match.player1 : match.player2;
  const other = isPlayer1 ? match.player2 : match.player1;
  const otherAccepted = isPlayer1 ? match.player2Accepted : match.player1Accepted;

  // Cooldown the decliner
  applyCooldown(decliner.discordId);

  // Re-queue the other player to front if they had accepted (or even if waiting)
  queue.unshift(other);

  return {
    decliner,
    confirmer: otherAccepted ? other : other, // re-queued either way
  };
}

function handleMatchTimeout(matchId: string): void {
  const match = pendingMatches.get(matchId);
  if (!match) return;

  pendingMatches.delete(matchId);

  const dodgers: QueuedPlayer[] = [];
  const confirmers: QueuedPlayer[] = [];

  if (!match.player1Accepted) dodgers.push(match.player1);
  else confirmers.push(match.player1);

  if (!match.player2Accepted) dodgers.push(match.player2);
  else confirmers.push(match.player2);

  // Cooldown dodgers
  for (const dodger of dodgers) {
    applyCooldown(dodger.discordId);
  }

  // Re-queue confirmers to front
  for (const confirmer of confirmers.reverse()) {
    queue.unshift(confirmer);
  }

  // Notify via callback
  if (onMatchTimeout) {
    onMatchTimeout(match, dodgers, confirmers);
  }
}

// --- Cooldowns ---

function applyCooldown(discordId: string): void {
  dodgeCooldowns.set(discordId, Date.now() + DODGE_COOLDOWN_MS);
}

export function getCooldownRemaining(discordId: string): number {
  const expiry = dodgeCooldowns.get(discordId);
  if (!expiry) return 0;
  const remaining = expiry - Date.now();
  if (remaining <= 0) {
    dodgeCooldowns.delete(discordId);
    return 0;
  }
  return remaining;
}

// --- Game Servers ---

function getAvailableServer(): GameServer | null {
  return gameServers.find(s => s.status === 'AVAILABLE') || null;
}

function assignServer(matchId: string): GameServer | null {
  const server = getAvailableServer();
  if (!server) return null;
  server.status = 'IN_USE';
  server.currentMatchId = matchId;
  return server;
}

export function releaseGameServer(serverId: string): boolean {
  const server = gameServers.find(s => s.id === serverId);
  if (!server) return false;
  server.status = 'AVAILABLE';
  server.currentMatchId = undefined;
  console.log(`[Queue] Released game server ${server.name} (${server.id})`);
  return true;
}

export function getGameServers(): GameServer[] {
  return [...gameServers];
}
