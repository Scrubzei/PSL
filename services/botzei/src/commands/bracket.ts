import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
} from 'discord.js';
import { generateBracketImage } from '../utils/bracketCanvas.js';

interface Tournament {
  id: string;
  slug: string;
  name: string;
  status: string;
  maxParticipants: number;
  game: { id: string; name: string };
  platform: { id: string; name: string };
  participantCount?: number;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  nextMatchId: string | null;
  isBye: boolean;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  gameMaps: { id: string; mapName: string }[];
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
  .setName('bracket')
  .setDescription('View a live tournament bracket');

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const tournaments = (await res.json()) as Tournament[];
    const active = tournaments.filter(t => t.status === 'IN_PROGRESS');

    if (active.length === 0) {
      await interaction.editReply({ content: 'No tournaments are currently running.' });
      return;
    }

    // If only one, skip the dropdown
    if (active.length === 1) {
      const response = await buildBracketMessage(active[0].id);
      await interaction.editReply(response);
      return;
    }

    // Multiple — show select menu
    const select = new StringSelectMenuBuilder()
      .setCustomId(`bracket_select_${interaction.user.id}`)
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
      .setDescription('Choose a tournament to view its bracket:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in /bracket:', error);
    await interaction.editReply({ content: 'Failed to fetch tournaments. Please try again later.' });
  }
}

export async function buildBracketMessage(tournamentId: string) {
  const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`);
  if (!res.ok) throw new Error(`Bracket API error: ${res.status}`);

  const data = (await res.json()) as BracketResponse;
  const { tournament, matches } = data;

  const platform = tournament.platform?.name?.toLowerCase() || 'xbox';
  const color = PLATFORM_COLORS[platform] || 0x5865f2;

  const canvasMatches = matches.map(m => ({
    id: m.id,
    round: m.round,
    matchNumber: m.matchNumber,
    status: m.status,
    isBye: m.isBye,
    player1: m.player1 ?? undefined,
    player2: m.player2 ?? undefined,
    winner: m.winner ?? undefined,
  }));

  const imageBuffer = await generateBracketImage({
    name: tournament.name,
    matches: canvasMatches,
    bracketType: 'SINGLE_ELIMINATION',
    game: tournament.game?.name?.toLowerCase() || 'bo2',
    platform,
    status: tournament.status?.toLowerCase() || 'active',
    registeredPlayers: tournament.participantCount ?? 0,
    maxPlayers: tournament.maxParticipants || 8,
  });

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'bracket.png' });

  const totalMatches = matches.length;
  const completedMatches = matches.filter(m => m.status === 'COMPLETED').length;
  const byeMatches = matches.filter(m => m.isBye).length;
  const realCompleted = completedMatches - byeMatches;
  const realTotal = totalMatches - byeMatches;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(tournament.name)
    .setDescription(
      `**${tournament.game?.name || ''}** • ${tournament.platform?.name || ''}\n` +
      `Matches: ${realCompleted}/${realTotal} completed`,
    )
    .setImage('attachment://bracket.png');

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel('View on Website')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🏆')
      .setURL(`${FRONTEND_URL}/tournaments/${tournament.slug}/bracket`),
    new ButtonBuilder()
      .setCustomId(`bracket_refresh_${tournamentId}`)
      .setLabel('Refresh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🔄'),
  );

  return {
    embeds: [embed],
    components: [buttons],
    files: [attachment],
  };
}

export async function handleBracketSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('bracket_select_', '');

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  try {
    const response = await buildBracketMessage(interaction.values[0]);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error fetching bracket:', error);
    await interaction.editReply({
      content: 'Failed to fetch bracket. Please try again later.',
      embeds: [],
      components: [],
    });
  }
}

export async function handleBracketRefresh(interaction: ButtonInteraction) {
  const tournamentId = interaction.customId.replace('bracket_refresh_', '');

  await interaction.deferUpdate();

  try {
    const response = await buildBracketMessage(tournamentId);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error refreshing bracket:', error);
    await interaction.editReply({
      content: 'Failed to refresh bracket. Please try again later.',
      embeds: [],
      components: [],
    });
  }
}
