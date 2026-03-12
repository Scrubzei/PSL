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
import { setGuildTournament } from '../sidebets/sidebet-manager.js';

interface Tournament {
  id: string;
  slug: string;
  name: string;
  status: string;
  game: { id: string; name: string };
  platform: { id: string; name: string };
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

function canManage(interaction: { guild?: { ownerId: string } | null; user: { id: string }; member: any }): boolean {
  if (!interaction.guild || !interaction.member) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const roles = interaction.member.roles?.cache;
  if (roles?.some?.((r: any) => r.name.toLowerCase() === 'dot')) return true;
  return false;
}

function buildSetupCard(tournamentName: string): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const embed = new EmbedBuilder()
    .setColor(0x22D3EE)
    .setTitle(`SIDEBETS — ${tournamentName}`)
    .setDescription(
      `Place sidebets on active tournament matches!\n\n` +
      `**HOW IT WORKS**\n` +
      `1. Click **Create Sidebet** below\n` +
      `2. Pick a match and choose your player\n` +
      `3. Set your bet amount\n` +
      `4. Wait for someone to accept the other side\n` +
      `5. A server admin locks it in to make it official\n\n` +
      `**STATUS KEY**\n` +
      `🔵 **Open** — Waiting for a taker\n` +
      `🟡 **Accepted** — Waiting for lock-in\n` +
      `🟢 **Locked** — Official bet`
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('sidebet_create')
      .setLabel('Create Sidebet')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎰'),
  );

  return { embeds: [embed], components: [row] };
}

export const data = new SlashCommandBuilder()
  .setName('sidebet-setup')
  .setDescription('Set up sidebets for a tournament in this channel');

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can set up sidebets.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const tournaments = (await res.json()) as Tournament[];
    const active = tournaments.filter(t => t.status === 'BRACKET_READY' || t.status === 'IN_PROGRESS');

    if (active.length === 0) {
      await interaction.editReply({ content: 'No active tournaments found.' });
      return;
    }

    if (active.length === 1) {
      const t = active[0];
      setGuildTournament(interaction.guildId!, t.id, t.name, interaction.channelId);

      // Post the public card
      const { embeds, components } = buildSetupCard(t.name);
      if (interaction.channel && interaction.channel.isSendable()) {
        await interaction.channel.send({ embeds, components });
      }

      await interaction.editReply({ content: `Sidebets enabled for **${t.name}** in this channel.` });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`sidebet_setup_${interaction.user.id}`)
      .setPlaceholder('Select a tournament')
      .addOptions(
        active.slice(0, 25).map(t => ({
          label: t.name.slice(0, 100),
          description: `${t.game?.name || ''} • ${t.platform?.name || ''}`.slice(0, 100),
          value: `${t.id}::${t.name}`,
        })),
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x22D3EE)
      .setTitle('Sidebet Setup')
      .setDescription('Select a tournament to enable sidebets:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in /sidebet-setup:', error);
    await interaction.editReply({ content: 'Failed to fetch tournaments.' });
  }
}

export async function handleSidebetSetupSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('sidebet_setup_', '');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can do this.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const [tournamentId, ...nameParts] = interaction.values[0].split('::');
  const tournamentName = nameParts.join('::');
  setGuildTournament(interaction.guildId!, tournamentId, tournamentName, interaction.channelId!);

  // Post the public card
  const { embeds, components } = buildSetupCard(tournamentName);
  if (interaction.channel && interaction.channel.isSendable()) {
    await interaction.channel.send({ embeds, components });
  }

  await interaction.editReply({
    content: `Sidebets enabled for **${tournamentName}** in this channel.`,
    embeds: [],
    components: [],
  });
}
