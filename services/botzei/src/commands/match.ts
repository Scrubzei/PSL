import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

interface Tournament {
  id: string;
  slug: string;
  name: string;
  status: string;
  game: { id: string; name: string };
  platform: { id: string; name: string };
  participantCount?: number;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  isBye: boolean;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  gameMaps: { id: string; mapName: string }[];
  scheduledTime: string | null;
}

interface BracketResponse {
  tournament: Tournament;
  matches: BracketMatch[];
}

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107c10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xbf2120,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  READY: 'Ready to Play',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
};

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

// Cache bracket data per tournament so the match select can use it
const bracketCache = new Map<string, { tournament: Tournament; matches: BracketMatch[]; totalRounds: number }>();

export const data = new SlashCommandBuilder()
  .setName('match')
  .setDescription('View details for a specific tournament match');

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const tournaments = (await res.json()) as Tournament[];
    const active = tournaments.filter(t => t.status === 'IN_PROGRESS');

    if (active.length === 0) {
      await interaction.editReply({ content: 'No tournaments are currently running.' });
      return;
    }

    if (active.length === 1) {
      const response = await buildMatchSelectMessage(active[0].id, interaction.user.id);
      await interaction.editReply(response);
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`match_tournament_${interaction.user.id}`)
      .setPlaceholder('Select a tournament')
      .addOptions(
        active.slice(0, 25).map(t => ({
          label: t.name.slice(0, 100),
          description: `${t.game?.name || ''} • ${t.platform?.name || ''}`.slice(0, 100),
          value: t.id,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Select Tournament')
      .setDescription('Choose a tournament to view its matches:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in /match:', error);
    await interaction.editReply({ content: 'Failed to fetch tournaments. Please try again later.' });
  }
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === 1) return 'Grand Finals';
  if (round === 2) return 'Semi-Finals';
  if (round === 3) return 'Quarter-Finals';
  const roundFromStart = totalRounds - round + 1;
  return `Round ${roundFromStart}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Chicago' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
  return `${date}, ${time} CT`;
}

async function buildMatchSelectMessage(tournamentId: string, userId: string) {
  const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`);
  if (!res.ok) throw new Error(`Bracket API error: ${res.status}`);

  const data = (await res.json()) as BracketResponse;
  const { tournament, matches } = data;
  const totalRounds = Math.max(...matches.map(m => m.round));

  // Cache for when they pick a match
  bracketCache.set(tournamentId, { tournament, matches, totalRounds });

  const playable = matches
    .filter(m => !m.isBye && m.status !== 'COMPLETED')
    .sort((a, b) => b.round - a.round || a.matchNumber - b.matchNumber);

  if (playable.length === 0) {
    const platform = tournament.platform?.name?.toLowerCase() || 'xbox';
    const color = PLATFORM_COLORS[platform] || 0x5865f2;

    return {
      embeds: [new EmbedBuilder().setColor(color).setTitle(tournament.name).setDescription('No active matches.')],
      components: [],
    };
  }

  const options = playable.slice(0, 25).map(m => {
    const roundName = getRoundName(m.round, totalRounds);
    const p1 = m.player1?.username ?? 'TBD';
    const p2 = m.player2?.username ?? 'TBD';
    return {
      label: `Match ${m.matchNumber} — ${roundName}`.slice(0, 100),
      description: `${p1} vs ${p2} • ${STATUS_LABELS[m.status] || m.status}`.slice(0, 100),
      value: `${tournamentId}:${m.id}`,
    };
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`match_select_${userId}`)
    .setPlaceholder('Select a match')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const platform = tournament.platform?.name?.toLowerCase() || 'xbox';
  const color = PLATFORM_COLORS[platform] || 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${tournament.name} — Select Match`)
    .setDescription('Choose a match to view its details:');

  return { embeds: [embed], components: [row] };
}

function buildMatchDetailEmbed(match: BracketMatch, tournament: Tournament, totalRounds: number) {
  const platform = tournament.platform?.name?.toLowerCase() || 'xbox';
  const color = PLATFORM_COLORS[platform] || 0x5865f2;
  const roundName = getRoundName(match.round, totalRounds);
  const bracketUrl = `${FRONTEND_URL}/tournaments/${tournament.slug}/bracket`;

  const p1 = match.player1?.username ?? 'TBD';
  const p2 = match.player2?.username ?? 'TBD';

  let description = `### ${p1} vs ${p2}\n\n`;
  description += `**Round:** ${roundName}\n`;
  description += `**Status:** ${STATUS_LABELS[match.status] || match.status}\n`;

  if (match.scheduledTime) {
    description += `**Scheduled:** ${formatTime(match.scheduledTime)}\n`;
  }

  if (match.gameMaps?.length) {
    description += '\n**Maps:**\n';
    match.gameMaps.forEach((map, i) => {
      description += `${i + 1}. ${map.mapName}\n`;
    });
  }

  if (match.status === 'COMPLETED' && match.winner) {
    description += `\n**Winner:** ${match.winner.username}`;
  }

  description += `\n[View Bracket](${bracketUrl})`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${tournament.name} — Match ${match.matchNumber}`)
    .setDescription(description);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Bracket')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🏆')
      .setURL(bracketUrl),
  );

  return { embeds: [embed], components: [buttons] };
}

export async function handleMatchTournamentSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('match_tournament_', '');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  try {
    const response = await buildMatchSelectMessage(interaction.values[0], userId);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error fetching matches:', error);
    await interaction.editReply({ content: 'Failed to fetch matches.', embeds: [], components: [] });
  }
}

export async function handleMatchSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('match_select_', '');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  try {
    const [tournamentId, matchId] = interaction.values[0].split(':');

    let cached = bracketCache.get(tournamentId);
    if (!cached) {
      const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`);
      if (!res.ok) throw new Error(`Bracket API error: ${res.status}`);
      const data = (await res.json()) as BracketResponse;
      const totalRounds = Math.max(...data.matches.map(m => m.round));
      cached = { tournament: data.tournament, matches: data.matches, totalRounds };
      bracketCache.set(tournamentId, cached);
    }

    const match = cached.matches.find(m => m.id === matchId);
    if (!match) {
      await interaction.editReply({ content: 'Match not found.', embeds: [], components: [] });
      return;
    }

    const response = buildMatchDetailEmbed(match, cached.tournament, cached.totalRounds);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error fetching match detail:', error);
    await interaction.editReply({ content: 'Failed to fetch match details.', embeds: [], components: [] });
  }
}
