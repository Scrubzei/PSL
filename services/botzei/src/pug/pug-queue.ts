// In-memory PUG queue state, keyed by channel ID.

export interface PugPlayer {
  discordId: string;
  username: string;
}

export interface PugQueue {
  channelId: string;
  messageId: string; // current embed message ID
  name: string;
  maps: string[];
  leaderboardId: string;
  players: PugPlayer[];
}

const queues = new Map<string, PugQueue>();

export function getQueue(channelId: string): PugQueue | undefined {
  return queues.get(channelId);
}

export function createQueue(channelId: string, messageId: string, name: string, maps: string[], leaderboardId: string): PugQueue {
  const queue: PugQueue = { channelId, messageId, name, maps, leaderboardId, players: [] };
  queues.set(channelId, queue);
  return queue;
}

export function deleteQueue(channelId: string): void {
  queues.delete(channelId);
}

export function updateMessageId(channelId: string, messageId: string): void {
  const queue = queues.get(channelId);
  if (queue) queue.messageId = messageId;
}

export function addPlayer(channelId: string, player: PugPlayer): { added: boolean; isFull: boolean; players: PugPlayer[] } {
  const queue = queues.get(channelId);
  if (!queue) return { added: false, isFull: false, players: [] };

  if (queue.players.some(p => p.discordId === player.discordId)) {
    return { added: false, isFull: false, players: queue.players };
  }

  queue.players.push(player);
  const isFull = queue.players.length >= 2;
  return { added: true, isFull, players: [...queue.players] };
}

export function removePlayer(channelId: string, discordId: string): { removed: boolean; players: PugPlayer[] } {
  const queue = queues.get(channelId);
  if (!queue) return { removed: false, players: [] };

  const index = queue.players.findIndex(p => p.discordId === discordId);
  if (index === -1) return { removed: false, players: queue.players };

  queue.players.splice(index, 1);
  return { removed: true, players: [...queue.players] };
}

export function clearPlayers(channelId: string): void {
  const queue = queues.get(channelId);
  if (queue) queue.players = [];
}

export function getAllQueues(): PugQueue[] {
  return [...queues.values()];
}
