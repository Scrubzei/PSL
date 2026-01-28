import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuInteraction,
  ButtonInteraction,
} from 'discord.js';

interface LeaderboardEntry {
  rank: number;
  username: string;
  xp: number;
  rankScore: number;
  wins: number;
  losses: number;
}

interface Leaderboard {
  id: string;
  game: { name: string; displayName: string };
  platform: { name: string; displayName: string };
}

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107C10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xBF2120,
};

const PLATFORM_DISPLAY: Record<string, string> = {
  xbox: 'Xbox',
  ps3: 'PS3',
  playstation: 'PS3',
  plutonium: 'Plutonium',
};

const PLATFORM_BUTTON_STYLE: Record<string, ButtonStyle> = {
  xbox: ButtonStyle.Success,
  ps3: ButtonStyle.Primary,
  playstation: ButtonStyle.Primary,
  plutonium: ButtonStyle.Danger,
};

const GAMES = [
  { name: 'BO2', value: 'bo2' },
  { name: 'MW3', value: 'mw3' },
  { name: 'MW2', value: 'mw2' },
];

const PLATFORMS = [
  { name: 'Xbox', value: 'xbox' },
  { name: 'PlayStation', value: 'ps3' },
  { name: 'Plutonium', value: 'plutonium' },
];

const ENTRIES_PER_PAGE = 10;

// ANSI color codes for Discord
const ANSI = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  green: '\u001b[1;92m',
  blue: '\u001b[34m',
  red: '\u001b[31m',
  gold: '\u001b[33m',
  silver: '\u001b[37m',
  bronze: '\u001b[38;5;208m',
  white: '\u001b[1;37m',
};

const PLATFORM_ANSI: Record<string, string> = {
  xbox: ANSI.green,
  ps3: ANSI.blue,
  playstation: ANSI.blue,
  plutonium: ANSI.red,
};

const MEDAL_COLORS: Record<number, string> = {
  1: ANSI.gold,
  2: ANSI.silver,
  3: ANSI.bronze,
};

const MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}

function buildTable(entries: LeaderboardEntry[], startIndex: number, platform: string): string {
  const rankWidth = 3;
  const nameWidth = 15;
  const wlWidth = 7;
  const pctWidth = 4;

  const platformColor = PLATFORM_ANSI[platform] || ANSI.blue;

  let table = '```ansi\n';

  // Header
  table += `${ANSI.bold}${platformColor}${padRight('#', rankWidth)} ${padRight('Player', nameWidth)} ${padRight('W/L', wlWidth)} ${padLeft('%', pctWidth)}${ANSI.reset}\n`;
  table += `${platformColor}${'─'.repeat(rankWidth)} ${'─'.repeat(nameWidth)} ${'─'.repeat(wlWidth)} ${'─'.repeat(pctWidth)}${ANSI.reset}\n`;

  // Rows
  entries.forEach((entry, index) => {
    const globalRank = startIndex + index + 1;
    const total = entry.wins + entry.losses;
    const winPct = total > 0 ? Math.round((entry.wins / total) * 100) : 0;

    const rankStr = padRight(`${globalRank}.`, rankWidth);
    const nameStr = padRight(entry.username.slice(0, nameWidth), nameWidth);
    const wlStr = padRight(`${entry.wins}-${entry.losses}`, wlWidth);
    const pctStr = padLeft(`${winPct}`, pctWidth);

    // Stylize top 3
    const medalColor = MEDAL_COLORS[globalRank];
    if (medalColor) {
      table += `${medalColor}${rankStr} ${ANSI.white}${nameStr}${ANSI.reset} ${wlStr} ${pctStr}\n`;
    } else {
      table += `${rankStr} ${nameStr} ${wlStr} ${pctStr}\n`;
    }
  });

  table += '```';
  return table;
}

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View leaderboard standings')
  .addStringOption(option =>
    option
      .setName('game')
      .setDescription('Game to view')
      .setRequired(true)
      .addChoices(...GAMES)
  )
  .addStringOption(option =>
    option
      .setName('platform')
      .setDescription('Platform to view')
      .setRequired(true)
      .addChoices(...PLATFORMS)
  );

export async function buildLeaderboardResponse(game: string, platform: string, page: number = 1) {
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  // Get leaderboard by game and platform
  const leaderboardRes = await fetch(
    `${backendUrl}/leaderboards/by-game-platform?game=${game}&platform=${platform}`
  );

  if (!leaderboardRes.ok) {
    if (leaderboardRes.status === 404) {
      return {
        content: `No leaderboard found for ${game.toUpperCase()} on ${platform}.`,
        embeds: [],
        components: [],
      };
    }
    throw new Error(`API error: ${leaderboardRes.status}`);
  }

  const leaderboard: Leaderboard = await leaderboardRes.json();

  // Get entries
  const entriesRes = await fetch(
    `${backendUrl}/leaderboards/${leaderboard.id}/entries?type=ranked`
  );

  if (!entriesRes.ok) {
    throw new Error(`API error: ${entriesRes.status}`);
  }

  const allEntries: LeaderboardEntry[] = await entriesRes.json();

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allEntries.length / ENTRIES_PER_PAGE));
  page = Math.max(1, Math.min(page, totalPages));
  const startIndex = (page - 1) * ENTRIES_PER_PAGE;
  const entries = allEntries.slice(startIndex, startIndex + ENTRIES_PER_PAGE);

  // Get colors
  const color = PLATFORM_COLORS[platform] || 0x5865F2;
  const gameDisplay = leaderboard.game?.displayName || game.toUpperCase();
  const platformDisplay = PLATFORM_DISPLAY[platform] || leaderboard.platform?.displayName || platform;

  // Build table
  const table = buildTable(entries, startIndex, platform);

  // Build embed
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${gameDisplay} ${platformDisplay}`)
    .setDescription(table)
    .setFooter({ text: `Page ${page}/${totalPages} • ${allEntries.length} players` });

  // Build components
  const gameSelect = new StringSelectMenuBuilder()
    .setCustomId('leaderboard_game')
    .setPlaceholder('Change Game')
    .addOptions(
      GAMES.map(g => ({
        label: g.name,
        value: `${g.value}_${platform}_1`,
        default: g.value === game,
      }))
    );

  const platformSelect = new StringSelectMenuBuilder()
    .setCustomId('leaderboard_platform')
    .setPlaceholder('Change Platform')
    .addOptions(
      PLATFORMS.map(p => ({
        label: p.name,
        value: `${game}_${p.value}_1`,
        default: p.value === platform,
      }))
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(gameSelect);
  const platformRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(platformSelect);

  // Combine nav buttons and website button
  const websiteButtonStyle = PLATFORM_BUTTON_STYLE[platform] || ButtonStyle.Primary;
  const buttonsRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb_prev_${game}_${platform}_${page}`)
      .setEmoji('1465901494015361218')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`lb_refresh_${game}_${platform}_${page}`)
      .setEmoji('1465539076756209767')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`lb_next_${game}_${platform}_${page}`)
      .setEmoji('1465901429074952297')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId(`lb_website_${game}_${platform}`)
      .setEmoji('1465919654122754191')
      .setStyle(websiteButtonStyle)
  );

  return {
    embeds: [embed],
    components: [selectRow, platformRow, buttonsRow],
  };
}

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const game = interaction.options.get('game')?.value as string;
  const platform = interaction.options.get('platform')?.value as string;

  try {
    const response = await buildLeaderboardResponse(game, platform, 1);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    await interaction.editReply({
      content: 'Failed to fetch leaderboard. Please try again later.',
    });
  }
}

// Handle select menu interactions
export async function handleSelectMenu(interaction: StringSelectMenuInteraction) {
  await interaction.deferUpdate();

  const [game, platform, pageStr] = interaction.values[0].split('_');
  const page = parseInt(pageStr) || 1;

  try {
    const response = await buildLeaderboardResponse(game, platform, page);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}

// Handle button interactions
export async function handleButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const game = parts[2];
  const platform = parts[3];
  const currentPage = parseInt(parts[4]) || 1;

  // Handle website button separately
  if (action === 'website') {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
    await interaction.reply({
      content: `🔗 ${frontendUrl}/leaderboards/${game}/${platform}`,
      ephemeral: true,
    });
    return;
  }

  await interaction.deferUpdate();

  let newPage = currentPage;

  switch (action) {
    case 'prev':
      newPage = Math.max(1, currentPage - 1);
      break;
    case 'refresh':
      newPage = currentPage;
      break;
    case 'next':
      newPage = currentPage + 1;
      break;
  }

  try {
    const response = await buildLeaderboardResponse(game, platform, newPage);
    await interaction.editReply(response);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
  }
}
