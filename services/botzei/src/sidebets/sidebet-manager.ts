export interface Sidebet {
  id: number;
  guildId: string;
  tournamentId: string;
  matchId: string;
  // Creator
  creatorDiscordId: string;
  creatorName: string;
  pickedPlayerId: string;
  pickedPlayerName: string;
  amount: number;
  // Acceptor
  acceptorDiscordId?: string;
  acceptorName?: string;
  acceptorPickedPlayerId?: string;
  acceptorPickedPlayerName?: string;
  // State
  status: 'OPEN' | 'ACCEPTED' | 'LOCKED' | 'CANCELLED';
  createdAt: Date;
  // Match context
  matchLabel: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}

interface GuildSetup {
  tournamentId: string;
  tournamentName: string;
  channelId: string;
}

const guildSetups = new Map<string, GuildSetup>();
const sidebets: Sidebet[] = [];
let nextId = 1;

export function setGuildTournament(guildId: string, tournamentId: string, tournamentName: string, channelId: string): void {
  guildSetups.set(guildId, { tournamentId, tournamentName, channelId });
}

export function getGuildSetup(guildId: string): GuildSetup | undefined {
  return guildSetups.get(guildId);
}

export function createSidebet(params: Omit<Sidebet, 'id' | 'status' | 'createdAt' | 'acceptorDiscordId' | 'acceptorName' | 'acceptorPickedPlayerId' | 'acceptorPickedPlayerName'>): Sidebet {
  const sidebet: Sidebet = {
    ...params,
    id: nextId++,
    status: 'OPEN',
    createdAt: new Date(),
  };
  sidebets.push(sidebet);
  return sidebet;
}

export function acceptSidebet(id: number, acceptorDiscordId: string, acceptorName: string): Sidebet | string {
  const bet = sidebets.find(s => s.id === id);
  if (!bet) return 'Sidebet not found.';
  if (bet.status !== 'OPEN') return 'This sidebet is no longer open.';
  if (bet.creatorDiscordId === acceptorDiscordId) return "You can't accept your own sidebet.";

  bet.acceptorDiscordId = acceptorDiscordId;
  bet.acceptorName = acceptorName;
  bet.acceptorPickedPlayerId = bet.pickedPlayerId === bet.player1Id ? bet.player2Id : bet.player1Id;
  bet.acceptorPickedPlayerName = bet.pickedPlayerId === bet.player1Id ? bet.player2Name : bet.player1Name;
  bet.status = 'ACCEPTED';
  return bet;
}

export function lockSidebet(id: number): Sidebet | string {
  const bet = sidebets.find(s => s.id === id);
  if (!bet) return 'Sidebet not found.';
  if (bet.status !== 'ACCEPTED') return 'Can only lock an accepted sidebet.';
  bet.status = 'LOCKED';
  return bet;
}

export function cancelSidebet(id: number, discordId: string): Sidebet | string {
  const bet = sidebets.find(s => s.id === id);
  if (!bet) return 'Sidebet not found.';
  if (bet.status !== 'OPEN') return 'Can only cancel an open sidebet.';
  if (bet.creatorDiscordId !== discordId) return 'Only the creator can cancel this sidebet.';
  bet.status = 'CANCELLED';
  return bet;
}

export function getSidebetsForGuild(guildId: string): Sidebet[] {
  const setup = guildSetups.get(guildId);
  if (!setup) return [];
  return sidebets
    .filter(s => s.guildId === guildId && s.tournamentId === setup.tournamentId)
    .sort((a, b) => b.id - a.id);
}

export function getSidebet(id: number): Sidebet | undefined {
  return sidebets.find(s => s.id === id);
}
