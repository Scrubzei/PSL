import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  ForumChannel,
} from 'discord.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';
const THREADS_CHANNEL_ID = '1482001211166298123';

function canManage(interaction: ChatInputCommandInteraction | StringSelectMenuInteraction): boolean {
  if (!interaction.guild || !interaction.member) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const roles = (interaction.member.roles as any)?.cache;
  if (roles?.some?.((r: any) => r.name.toLowerCase() === 'dot')) return true;
  return false;
}

export const data = new SlashCommandBuilder()
  .setName('tourney-threads')
  .setDescription('Create match threads for active tournament matches');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments?limit=25`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const tournaments = await res.json() as any[];

    const eligible = tournaments.filter((t: any) =>
      ['BRACKET_READY', 'IN_PROGRESS'].includes(t.status)
    );

    if (eligible.length === 0) {
      await interaction.editReply('No tournaments with active brackets found.');
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('tourney_threads_select')
      .setPlaceholder('Select a tournament')
      .addOptions(
        eligible.map((t: any) => ({
          label: t.name,
          description: `${t.participantCount}/${t.maxParticipants} players · ${t.status}`,
          value: t.id,
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await interaction.editReply({ content: 'Choose a tournament:', components: [row] });
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    await interaction.editReply('Failed to fetch tournaments.');
  }
}

export async function handleSelect(interaction: StringSelectMenuInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  const tournamentId = interaction.values[0];
  const guild = interaction.guild!;

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`, {
      headers: { 'X-API-Key': API_KEY },
    });
    const data = await res.json() as any;

    const allMatches = data.matches || [];
    const totalRounds = allMatches.length > 0
      ? Math.max(...allMatches.map((m: any) => m.round))
      : 0;

    const activeMatches = allMatches.filter((m: any) =>
      (m.status === 'READY' || m.status === 'IN_PROGRESS') && !m.isBye && m.player1 && m.player2
    );

    if (activeMatches.length === 0) {
      await interaction.editReply({ content: 'No active matches found in this tournament.', components: [] });
      return;
    }

    const channel = await guild.channels.fetch(THREADS_CHANNEL_ID) as ForumChannel;
    if (!channel) {
      await interaction.editReply({ content: 'Forum channel not found.', components: [] });
      return;
    }

    let created = 0;
    for (const match of activeMatches) {
      const p1 = match.player1.username;
      const p2 = match.player2.username;
      const displayRound = totalRounds - match.round + 1;
      const threadName = `[R${displayRound} 🟡] ${p1} vs ${p2}`;

      await channel.threads.create({
        name: threadName,
        message: { content: `**Round ${displayRound}** — ${p1} vs ${p2}` },
        reason: `Tournament match: ${p1} vs ${p2}`,
      });
      created++;
    }

    await interaction.editReply({
      content: `Created **${created}** match thread${created !== 1 ? 's' : ''} in <#${THREADS_CHANNEL_ID}>.`,
      components: [],
    });
  } catch (error: any) {
    console.error('Error creating tournament threads:', error);
    await interaction.editReply({ content: 'Failed to create threads.', components: [] });
  }
}
