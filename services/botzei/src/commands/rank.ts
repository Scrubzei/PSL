import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from 'discord.js';

// Dynamic import to avoid loading canvas at deploy time
const loadRankCardGenerator = () => import('../utils/rankCardCanvas.js');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';

interface UserStatsResponse {
  user: {
    id: string;
    username: string;
    avatar?: string;
    discordAvatar?: string;
  };
  stats: {
    level: number;
    totalXp: number;
    totalWins: number;
    totalLosses: number;
    winRate: number;
    leaderboardRankings: Array<{
      game: string;
      platform: string;
      rank: number;
      totalPlayers: number;
      wins: number;
      losses: number;
    }>;
  };
}

export const data = new SlashCommandBuilder()
  .setName('rank')
  .setDescription('View a player\'s rank card with their level, stats, and leaderboard positions')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The Discord user to look up (defaults to yourself)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  try {
    // Get the target user (mentioned user or self)
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const discordId = targetUser.id;

    // Fetch user stats from backend
    const response = await fetch(`${BACKEND_URL}/users/by-discord/${discordId}/stats`);

    if (!response.ok) {
      if (response.status === 404) {
        await interaction.editReply({
          content: `<@${targetUser.id}> doesn't have an account linked yet. They need to sign in at ${FRONTEND_URL} first!`
        });
        return;
      }
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as UserStatsResponse | null;

    if (!data || !data.user) {
      await interaction.editReply({
        content: `<@${targetUser.id}> doesn't have an account linked yet. They need to sign in at ${FRONTEND_URL} first!`
      });
      return;
    }

    const { user, stats } = data;

    // Generate the rank card image (dynamic import to avoid canvas loading at deploy time)
    const { generateRankCard } = await loadRankCardGenerator();
    const cardBuffer = await generateRankCard({
      username: user.username || 'Unknown',
      avatar: user.avatar || user.discordAvatar || targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
      level: stats.level || 1,
      totalXp: stats.totalXp || 0,
      totalWins: stats.totalWins || 0,
      totalLosses: stats.totalLosses || 0,
      winRate: stats.winRate || 0,
      leaderboardRankings: stats.leaderboardRankings || [],
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: 'rank-card.png' });

    const embed = new EmbedBuilder()
      .setColor(0x22d3ee)
      .setImage('attachment://rank-card.png')
      .setFooter({ text: `View full profile at ${FRONTEND_URL}/users/${user.id}` });

    await interaction.editReply({
      embeds: [embed],
      files: [attachment],
    });

  } catch (error) {
    console.error('Error in rank command:', error);
    await interaction.editReply({
      content: 'Failed to fetch rank data. Please try again later.',
    });
  }
}
