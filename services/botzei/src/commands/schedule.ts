import {
  SlashCommandBuilder,
  CommandInteraction,
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

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

export const data = new SlashCommandBuilder()
  .setName('schedule')
  .setDescription('View upcoming scheduled matches for a tournament');

export async function execute(interaction: CommandInteraction) {
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
      const response = await buildScheduleMessage(active[0].id);
      await interaction.editReply(response);
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`schedule_select_${interaction.user.id}`)
      .setPlaceholder('Select a tournament')
      .addOptions(
        active.slice(0, 25).map(t => ({
          label: t.name.slice(0, 100),
          description: `${t.game?.name || ''} • ${t.platform?.name || ''} • ${t.participantCount ?? '?'} players`.slice(0, 100),
          value: t.id,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('Select Tournament')
      .setDescription('Choose a tournament to view its schedule:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in /schedule:', error);
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

export async function buildScheduleMessage(tournamentId: string) {
  const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`);
  if (!res.ok) throw new Error(`Bracket API error: ${res.status}`);

  const data = (await res.json()) as BracketResponse;
  const { tournament, matches } = data;

  const now = new Date();
  const upcoming = matches
    .filter(m => m.scheduledTime && !m.isBye && m.status !== 'COMPLETED' && new Date(m.scheduledTime) >= now)
    .sort((a, b) => new Date(a.scheduledTime!).getTime() - new Date(b.scheduledTime!).getTime());

  const platform = tournament.platform?.name?.toLowerCase() || 'xbox';
  const color = PLATFORM_COLORS[platform] || 0x5865f2;
  const bracketUrl = `${FRONTEND_URL}/tournaments/${tournament.slug}/bracket`;

  const totalRounds = Math.max(...matches.map(m => m.round));

  if (upcoming.length === 0) {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${tournament.name} — Schedule`)
      .setDescription('No upcoming scheduled matches.');

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View Bracket')
        .setStyle(ButtonStyle.Link)
        .setEmoji('🏆')
        .setURL(bracketUrl),
    );

    return { embeds: [embed], components: [buttons] };
  }

  const lines = upcoming.slice(0, 15).map(m => {
    const roundName = getRoundName(m.round, totalRounds);
    const p1 = m.player1?.username ?? 'TBD';
    const p2 = m.player2?.username ?? 'TBD';
    const time = formatTime(m.scheduledTime!);
    return `**${roundName}** — Match ${m.matchNumber}\n${p1} vs ${p2}\n🕐 ${time}`;
  });

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${tournament.name} — Upcoming Matches`)
    .setDescription(lines.join('\n\n'));

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View Bracket')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🏆')
      .setURL(bracketUrl),
  );

  return { embeds: [embed], components: [buttons] };
}

export async function handleScheduleSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('schedule_select_', '');

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  try {
    const response = await buildScheduleMessage(interaction.values[0]);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    await interaction.editReply({
      content: 'Failed to fetch schedule. Please try again later.',
      embeds: [],
      components: [],
    });
  }
}
