import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  PermissionFlagsBits,
  TextChannel,
  AttachmentBuilder,
} from 'discord.js';
import { generateAnnounceBanner } from '../utils/announceBanner.js';

interface Tournament {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status: string;
  format: string;
  maxParticipants: number;
  participantCount: number;
  startDate?: string;
  registrationDeadline?: string;
  roundDeadlines?: { name: string; deadline: string | null }[];
  prizePool?: { place: number; prize: string }[];
  game: { name: string; displayName: string };
  platform: { name: string; displayName: string };
}

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107C10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xBF2120,
};

export const data = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Announce a tournament for signups')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const userId = interaction.user.id;

  try {
    const res = await fetch(`${backendUrl}/tournaments?limit=25`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const tournaments = (await res.json()) as Tournament[];
    const open = tournaments.filter(t => t.status?.toUpperCase() === 'REGISTRATION');

    if (open.length === 0) {
      await interaction.editReply({ content: 'No tournaments open for registration.' });
      return;
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`announce_select_${userId}`)
      .setPlaceholder('Pick a tournament to announce')
      .addOptions(
        open.slice(0, 25).map(t => ({
          label: t.name.slice(0, 100),
          description: `${t.game?.displayName || ''} • ${t.platform?.displayName || ''} • ${t.participantCount ?? 0}/${t.maxParticipants} players`.slice(0, 100),
          value: t.id,
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    await interaction.editReply({
      content: 'Choose a tournament to announce:',
      components: [row],
    });
  } catch (error) {
    console.error('Error fetching tournaments for announce:', error);
    await interaction.editReply({ content: 'Failed to fetch tournaments. Try again later.' });
  }
}

export async function handleAnnounceSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('announce_select_', '');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const tournamentId = interaction.values[0];
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  try {
    const res = await fetch(`${backendUrl}/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const t = (await res.json()) as Tournament;
    const platform = t.platform?.name?.toLowerCase() || 'unknown';
    const color = PLATFORM_COLORS[platform] || 0x5865F2;
    const tournamentUrl = `${frontendUrl}/tournaments/${t.slug || t.id}`;

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(t.name)
      .setURL(tournamentUrl)
      .setDescription(t.description || null);

    // Start date
    if (t.startDate) {
      const unix = Math.floor(new Date(t.startDate).getTime() / 1000);
      embed.addFields({ name: '\u200b\n__Starts__', value: `<t:${unix}:F>`, inline: false });
    }

    // Deadlines
    if (t.roundDeadlines && t.roundDeadlines.length > 0) {
      const deadlines = t.roundDeadlines
        .map(rd => {
          if (rd.deadline) {
            const unix = Math.floor(new Date(rd.deadline).getTime() / 1000);
            return `**${rd.name}** \u2014 <t:${unix}:D>`;
          }
          return `**${rd.name}** \u2014 TBD`;
        })
        .join('\n');
      embed.addFields({ name: '\u200b\n__Deadlines__', value: deadlines, inline: false });
    }

    // How it works
    embed.addFields({
      name: '\u200b\n__How It Works__',
      value: [
        'Arrange a match time with your opponent before each deadline.',
        'Each player picks a map and both agree on a third \u2014 if they can\'t agree, the website will randomly select it.',
        'Admins and refs are available to help if needed.',
        '**If a time is agreed upon and a player fails to show, they are disqualified.**',
      ].join(' '),
      inline: false,
    });

    // Generate banner image
    const bannerBuffer = await generateAnnounceBanner({
      title: t.name,
      game: t.game?.name || 'bo2',
      platform: platform,
      prizePool: t.prizePool,
      startDate: t.startDate,
    });
    const bannerAttachment = new AttachmentBuilder(bannerBuffer, { name: 'banner.png' });
    embed.setImage('attachment://banner.png');

    // Author — who announced it
    embed.setAuthor({
      name: `Announced by ${interaction.user.displayName}`,
      iconURL: interaction.user.displayAvatarURL(),
    });

    // Buttons
    const buttonStyle = PLATFORM_COLORS[platform] === 0x107C10
      ? ButtonStyle.Success
      : PLATFORM_COLORS[platform] === 0x003791
        ? ButtonStyle.Primary
        : ButtonStyle.Danger;

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`announce_signup_${tournamentId}`)
        .setLabel('Sign Up Now')
        .setEmoji('1465919654122754191')
        .setStyle(buttonStyle),
    );

    // Send the announcement as a regular channel message
    const channel = interaction.channel as TextChannel;
    await channel.send({
      content: '',
      embeds: [embed],
      components: [buttons],
      files: [bannerAttachment],
    });

    // Confirm to the admin
    await interaction.editReply({
      content: 'Announcement posted!',
      components: [],
    });
  } catch (error) {
    console.error('Error posting announcement:', error);
    await interaction.editReply({
      content: 'Failed to post announcement. Try again later.',
      components: [],
    });
  }
}

export async function handleAnnounceButton(interaction: ButtonInteraction) {
  const tournamentId = interaction.customId.replace('announce_signup_', '');
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  try {
    const res = await fetch(`${backendUrl}/tournaments/${tournamentId}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const t = (await res.json()) as Tournament;
    const url = `${frontendUrl}/tournaments/${t.slug || t.id}`;
    await interaction.reply({ content: url, ephemeral: true });
  } catch {
    await interaction.reply({ content: `${frontendUrl}/tournaments`, ephemeral: true });
  }
}
