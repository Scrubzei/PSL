import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { generateBracketImage } from '../utils/bracketCanvas';

interface Tournament {
  id: string;
  name: string;
  status: string;
  game: { name: string; displayName: string };
  platform: { name: string; displayName: string };
  bracketType: string;
  matches: Match[];
  participants?: { id: string; username: string }[];
  maxPlayers?: number;
}

interface Match {
  id: string;
  round: number;
  position: number;
  player1?: { id: string; username: string };
  player2?: { id: string; username: string };
  winner?: { id: string; username: string };
  player1Score?: number;
  player2Score?: number;
  status: string;
}

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107C10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xBF2120,
};

const STATUS_LABELS: Record<string, string> = {
  pending: '📋 OPEN FOR REGISTRATION',
  active: '🔴 LIVE',
  completed: '✅ COMPLETE',
};

const DROPDOWN_STATUS: Record<string, string> = {
  pending: 'OPEN FOR REGISTRATION',
  active: 'LIVE',
  completed: 'COMPLETE',
};

export const data = new SlashCommandBuilder()
  .setName('tournaments')
  .setDescription('View tournament brackets');

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const userId = interaction.user.id;

  try {
    // Fetch all tournaments
    const res = await fetch(`${backendUrl}/tournaments?limit=25`);

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const tournaments: Tournament[] = await res.json();

    if (tournaments.length === 0) {
      await interaction.editReply({ content: 'No tournaments found.' });
      return;
    }

    // Show tournament selection with status tags
    const select = new StringSelectMenuBuilder()
      .setCustomId(`tournament_select_${userId}`)
      .setPlaceholder('Select a tournament')
      .addOptions(
        tournaments.slice(0, 25).map(t => {
          const statusLabel = DROPDOWN_STATUS[t.status?.toLowerCase()] || t.status?.toUpperCase() || 'UNKNOWN';
          return {
            label: t.name.slice(0, 100),
            description: `${statusLabel} • ${t.game?.displayName || ''} ${t.platform?.displayName || ''}`.slice(0, 100),
            value: t.id,
          };
        })
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('Select Tournament')
      .setDescription('Choose a tournament to view its bracket:');

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    await interaction.editReply({
      content: 'Failed to fetch tournaments. Please try again later.',
    });
  }
}

export async function buildBracketResponse(tournamentId: string) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  const res = await fetch(`${backendUrl}/tournaments/${tournamentId}`);

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const tournament: Tournament = await res.json();
  const platform = tournament.platform?.name || 'unknown';
  const color = PLATFORM_COLORS[platform] || 0x5865F2;

  // Generate bracket image
  const imageBuffer = await generateBracketImage({
    name: tournament.name,
    matches: tournament.matches || [],
    bracketType: tournament.bracketType,
    game: tournament.game?.name || 'bo2',
    platform: platform,
    status: tournament.status?.toLowerCase() || 'pending',
    registeredPlayers: tournament.participants?.length || 0,
    maxPlayers: tournament.maxPlayers || 8,
  });

  const attachment = new AttachmentBuilder(imageBuffer, { name: 'bracket.png' });

  // Build description based on status
  const statusLabel = STATUS_LABELS[tournament.status?.toLowerCase()] || tournament.status?.toUpperCase() || 'UNKNOWN';
  let description = `**${tournament.game?.displayName || ''}** • ${tournament.platform?.displayName || ''}\n${statusLabel}`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(tournament.name)
    .setDescription(description)
    .setImage('attachment://bracket.png');

  // Build buttons based on status
  const buttons: ButtonBuilder[] = [];

  if (tournament.status?.toLowerCase() === 'pending') {
    buttons.push(
      new ButtonBuilder()
        .setLabel('Sign Up')
        .setStyle(ButtonStyle.Link)
        .setEmoji('✅')
        .setURL(`${frontendUrl}/tournaments/${tournamentId}`)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setLabel('View Bracket')
      .setStyle(ButtonStyle.Link)
      .setEmoji('🏆')
      .setURL(`${frontendUrl}/tournaments/${tournamentId}/bracket`)
  );

  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  return {
    embeds: [embed],
    components: [buttonsRow],
    files: [attachment],
  };
}

// Handle tournament selection
export async function handleTournamentSelect(interaction: StringSelectMenuInteraction) {
  // Check if the user who clicked is the one who initiated
  const userId = interaction.customId.replace('tournament_select_', '');

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const tournamentId = interaction.values[0];

  try {
    const response = await buildBracketResponse(tournamentId);
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
