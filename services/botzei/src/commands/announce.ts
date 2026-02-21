import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  TextChannel,
  AttachmentBuilder,
  type GuildMember,
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
      .setDescription(t.description ? `${t.description}\n\n───────────────────────────────` : null);

    // Deadlines (only show rounds with confirmed dates)
    if (t.roundDeadlines && t.roundDeadlines.length > 0) {
      const confirmedDeadlines = t.roundDeadlines
        .filter(rd => rd.deadline)
        .map(rd => {
          const unix = Math.floor(new Date(rd.deadline!).getTime() / 1000);
          return `**${rd.name}** \u2014 <t:${unix}:D>`;
        })
        .join('\n');
      if (confirmedDeadlines) {
        embed.addFields({ name: '\u200b\n\ud83d\udcc5 __Deadlines__', value: confirmedDeadlines, inline: false });
      }
    }

    // How it works
    embed.addFields({
      name: '\u200b\n\ud83d\udccb __How It Works__',
      value: [
        `All matches are best of 3 and follow [1v1 Leaderboards Rules](${frontendUrl}/rules). Each player picks a map and both agree on a third — if no agreement is reached, the website will randomly select it. Arrange your matches before each round's deadline. Admins and refs will be available to help schedule if needed.`,
        '',
        '__**If a time is agreed upon and a player fails to show, they are disqualified.**__',
        '',
        '__**A ref may request a PC check or screen share at any time. Failure to comply will result in a DQ.**__',
      ].join('\n'),
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
    const member = interaction.member as GuildMember | null;
    const announcer = member?.displayName || interaction.user.displayName;
    embed.setAuthor({
      name: `Announced by ${announcer}`,
      iconURL: member?.displayAvatarURL() || interaction.user.displayAvatarURL(),
    });

    // Buttons
    const signupUrl = `${frontendUrl}/tournaments/${t.slug || t.id}`;
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('Sign Up Now')
        .setEmoji('1465919654122754191')
        .setURL(signupUrl)
        .setStyle(ButtonStyle.Link),
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

