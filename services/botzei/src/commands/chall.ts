import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
} from 'discord.js';
import { api } from '../utils/api.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const LOGIN_URL = process.env.LOGIN_URL || 'http://localhost:3000/auth/discord';

const PLATFORMS = [
  { name: 'Xbox', value: 'xbox' },
  { name: 'PlayStation', value: 'ps3' },
  { name: 'Plutonium', value: 'plutonium' },
  { name: 'IW4X', value: 'iw4x' },
];

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107C10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xBF2120,
  iw4x: 0x7C3AED,
};

const GAMES = [
  { name: 'BO2', value: 'bo2' },
  { name: 'MW3', value: 'mw3' },
  { name: 'MW2', value: 'mw2' },
];

const BEST_OF_OPTIONS = [
  { name: 'Best of 1', value: '1' },
  { name: 'Best of 3', value: '3' },
  { name: 'Best of 5', value: '5' },
  { name: 'Best of 7', value: '7' },
  { name: 'Best of 9', value: '9' },
];

const MAPS: Record<string, { name: string; value: string }[]> = {
  bo2: [
    { name: 'Raid', value: 'raid' },
    { name: 'Standoff', value: 'standoff' },
    { name: 'Slums', value: 'slums' },
    { name: 'Hijacked', value: 'hijacked' },
    { name: 'Meltdown', value: 'meltdown' },
    { name: 'Plaza', value: 'plaza' },
    { name: 'Nuketown 2025', value: 'nuketown' },
    { name: 'Express', value: 'express' },
    { name: 'Cargo', value: 'cargo' },
    { name: 'Aftermath', value: 'aftermath' },
    { name: 'Carrier', value: 'carrier' },
    { name: 'Drone', value: 'drone' },
    { name: 'Overflow', value: 'overflow' },
    { name: 'Turbine', value: 'turbine' },
    { name: 'Yemen', value: 'yemen' },
  ],
  mw3: [
    { name: 'Arkaden', value: 'arkaden' },
    { name: 'Bootleg', value: 'bootleg' },
    { name: 'Carbon', value: 'carbon' },
    { name: 'Dome', value: 'dome' },
    { name: 'Downturn', value: 'downturn' },
    { name: 'Fallen', value: 'fallen' },
    { name: 'Hardhat', value: 'hardhat' },
    { name: 'Interchange', value: 'interchange' },
    { name: 'Lockdown', value: 'lockdown' },
    { name: 'Mission', value: 'mission' },
    { name: 'Outpost', value: 'outpost' },
    { name: 'Resistance', value: 'resistance' },
    { name: 'Seatown', value: 'seatown' },
    { name: 'Underground', value: 'underground' },
    { name: 'Village', value: 'village' },
  ],
  mw2: [
    { name: 'Afghan', value: 'afghan' },
    { name: 'Derail', value: 'derail' },
    { name: 'Estate', value: 'estate' },
    { name: 'Favela', value: 'favela' },
    { name: 'Highrise', value: 'highrise' },
    { name: 'Invasion', value: 'invasion' },
    { name: 'Karachi', value: 'karachi' },
    { name: 'Quarry', value: 'quarry' },
    { name: 'Rundown', value: 'rundown' },
    { name: 'Rust', value: 'rust' },
    { name: 'Scrapyard', value: 'scrapyard' },
    { name: 'Skidrow', value: 'skidrow' },
    { name: 'Sub Base', value: 'subbase' },
    { name: 'Terminal', value: 'terminal' },
    { name: 'Underpass', value: 'underpass' },
    { name: 'Wasteland', value: 'wasteland' },
  ],
};

// Store pending challenges while configuring
const pendingChallenges = new Map<string, {
  challengerId: string;
  opponentId: string;
  opponentUsername: string;
  platform: string;
  game: string;
  matchType: 'XP' | 'RANKED';
  bestOf?: number;
  selectedMaps: string[];
  currentMapIndex: number;
}>();

// Store confirmed challenges awaiting opponent response
const activeChallenges = new Map<string, {
  challengerId: string;
  opponentId: string;
  platform: string;
  game: string;
  matchType: 'XP' | 'RANKED';
  bestOf: number;
  maps: string[];
}>();

export const data = new SlashCommandBuilder()
  .setName('chall')
  .setDescription('Challenge another player to a match')
  .addUserOption(option =>
    option
      .setName('user')
      .setDescription('The player to challenge')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('platform')
      .setDescription('Platform to play on')
      .setRequired(true)
      .addChoices(...PLATFORMS)
  )
  .addStringOption(option =>
    option
      .setName('game')
      .setDescription('Game to play')
      .setRequired(true)
      .addChoices(...GAMES)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const challenger = interaction.user;
  const opponent = interaction.options.getUser('user', true);
  const platform = interaction.options.getString('platform', true);
  const game = interaction.options.getString('game', true);

  if (opponent.id === challenger.id) {
    await interaction.reply({ content: "You can't challenge yourself.", ephemeral: true });
    return;
  }

  if (opponent.bot) {
    await interaction.reply({ content: "You can't challenge a bot.", ephemeral: true });
    return;
  }

  // Challenger must have an account
  const challengerAccount = await api.getUserByDiscordId(challenger.id).catch(() => null);
  if (!challengerAccount) {
    await interaction.reply({
      content: `You need to create an account first! Sign in here: ${LOGIN_URL}`,
      ephemeral: true,
    });
    return;
  }

  const platformDisplay = PLATFORMS.find(p => p.value === platform)?.name || platform;
  const gameDisplay = GAMES.find(g => g.value === game)?.name || game;

  const challengeId = `${challenger.id}_${Date.now()}`;
  pendingChallenges.set(challengeId, {
    challengerId: challenger.id,
    opponentId: opponent.id,
    opponentUsername: opponent.username,
    platform,
    game,
    matchType: 'RANKED',
    selectedMaps: [],
    currentMapIndex: 0,
  });

  // Show best-of select
  const bestOfSelect = new StringSelectMenuBuilder()
    .setCustomId(`chall_bestof_${challengeId}`)
    .setPlaceholder('Select series length')
    .addOptions(BEST_OF_OPTIONS.map(b => ({ label: b.name, value: b.value })));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(bestOfSelect);
  const platformColor = PLATFORM_COLORS[platform] || 0x5865F2;

  const embed = new EmbedBuilder()
    .setColor(platformColor)
    .setTitle('Configure Challenge')
    .setDescription(
      `**Opponent:** ${opponent}\n` +
      `**Platform:** ${platformDisplay}\n` +
      `**Game:** ${gameDisplay}\n\n` +
      `Select the series length:`
    );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
  });
}

// --- Helpers ---

function getMapName(game: string, mapValue: string): string {
  const maps = MAPS[game] || [];
  return maps.find(m => m.value === mapValue)?.name || mapValue;
}

function buildMapSelectionEmbed(pending: NonNullable<ReturnType<typeof pendingChallenges.get>>, challengeId: string) {
  const platformDisplay = PLATFORMS.find(p => p.value === pending.platform)?.name || pending.platform;
  const gameDisplay = GAMES.find(g => g.value === pending.game)?.name || pending.game;
  const maps = MAPS[pending.game] || [];
  const platformColor = PLATFORM_COLORS[pending.platform] || 0x5865F2;

  let mapListDisplay = '';
  for (let i = 0; i < pending.bestOf!; i++) {
    const mapName = pending.selectedMaps[i] ? getMapName(pending.game, pending.selectedMaps[i]) : '---';
    const isCurrent = i === pending.currentMapIndex;
    mapListDisplay += `${isCurrent ? '▶ ' : '   '}**Game ${i + 1}:** ${mapName}\n`;
  }

  const embed = new EmbedBuilder()
    .setColor(platformColor)
    .setTitle('Select Maps')
    .setDescription(
      `**Opponent:** <@${pending.opponentId}>\n` +
      `**Platform:** ${platformDisplay}\n` +
      `**Game:** ${gameDisplay}\n` +
      `**Series:** Best of ${pending.bestOf}\n\n` +
      `${mapListDisplay}\n` +
      `Select map for Game ${pending.currentMapIndex + 1}:`
    );

  const mapSelect = new StringSelectMenuBuilder()
    .setCustomId(`chall_map_${challengeId}`)
    .setPlaceholder(`Select map for Game ${pending.currentMapIndex + 1}`)
    .addOptions(
      maps.slice(0, 25).map(m => ({
        label: m.name,
        value: m.value,
        default: pending.selectedMaps[pending.currentMapIndex] === m.value,
      }))
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(mapSelect);

  const allMapsSelected = pending.selectedMaps.length === pending.bestOf &&
    pending.selectedMaps.every(m => m !== undefined);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`chall_prev_${challengeId}`)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pending.currentMapIndex === 0),
    new ButtonBuilder()
      .setCustomId(`chall_next_${challengeId}`)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(pending.currentMapIndex >= pending.bestOf! - 1 || !pending.selectedMaps[pending.currentMapIndex]),
    new ButtonBuilder()
      .setCustomId(`chall_confirm_${challengeId}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success)
      .setDisabled(!allMapsSelected),
  );

  return { embed, components: [selectRow, buttonRow] };
}

// Best-of selected → show map selection
export async function handleBestOfSelect(interaction: StringSelectMenuInteraction) {
  const challengeId = interaction.customId.replace('chall_bestof_', '');
  const pending = pendingChallenges.get(challengeId);

  if (!pending) {
    await interaction.reply({ content: 'Challenge expired. Please start over.', ephemeral: true });
    return;
  }
  if (interaction.user.id !== pending.challengerId) {
    await interaction.reply({ content: 'This is not your challenge.', ephemeral: true });
    return;
  }

  pending.bestOf = parseInt(interaction.values[0]);
  pending.selectedMaps = [];
  pending.currentMapIndex = 0;

  const { embed, components } = buildMapSelectionEmbed(pending, challengeId);
  await interaction.update({ embeds: [embed], components });
}

// Step 4: Map selection
export async function handleMapSelect(interaction: StringSelectMenuInteraction) {
  const challengeId = interaction.customId.replace('chall_map_', '');
  const pending = pendingChallenges.get(challengeId);

  if (!pending) {
    await interaction.reply({ content: 'Challenge expired. Please start over.', ephemeral: true });
    return;
  }
  if (interaction.user.id !== pending.challengerId) {
    await interaction.reply({ content: 'This is not your challenge.', ephemeral: true });
    return;
  }

  pending.selectedMaps[pending.currentMapIndex] = interaction.values[0];

  if (pending.currentMapIndex < pending.bestOf! - 1 && !pending.selectedMaps[pending.currentMapIndex + 1]) {
    pending.currentMapIndex++;
  }

  const { embed, components } = buildMapSelectionEmbed(pending, challengeId);
  await interaction.update({ embeds: [embed], components });
}

// Navigation + Confirm buttons
export async function handleNavButton(interaction: ButtonInteraction) {
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const challengeId = parts.slice(2).join('_');

  const pending = pendingChallenges.get(challengeId);

  if (!pending) {
    await interaction.reply({ content: 'Challenge expired. Please start over.', ephemeral: true });
    return;
  }
  if (interaction.user.id !== pending.challengerId) {
    await interaction.reply({ content: 'This is not your challenge.', ephemeral: true });
    return;
  }

  if (action === 'prev') {
    pending.currentMapIndex = Math.max(0, pending.currentMapIndex - 1);
    const { embed, components } = buildMapSelectionEmbed(pending, challengeId);
    await interaction.update({ embeds: [embed], components });
  } else if (action === 'next') {
    pending.currentMapIndex = Math.min(pending.bestOf! - 1, pending.currentMapIndex + 1);
    const { embed, components } = buildMapSelectionEmbed(pending, challengeId);
    await interaction.update({ embeds: [embed], components });
  } else if (action === 'confirm') {
    const mapNames = pending.selectedMaps.map((m: string) => getMapName(pending.game, m));
    const platformDisplay = PLATFORMS.find(p => p.value === pending.platform)?.name || pending.platform;
    const gameDisplay = GAMES.find(g => g.value === pending.game)?.name || pending.game;

    // Store in active challenges (backend match created on accept)
    const activeChallengeId = `${pending.challengerId}_${Date.now()}`;
    activeChallenges.set(activeChallengeId, {
      challengerId: pending.challengerId,
      opponentId: pending.opponentId,
      platform: pending.platform,
      game: pending.game,
      matchType: pending.matchType,
      bestOf: pending.bestOf!,
      maps: pending.selectedMaps,
    });

    pendingChallenges.delete(challengeId);

    await interaction.update({
      content: 'Challenge sent!',
      embeds: [],
      components: [],
    });

    const platformColor = PLATFORM_COLORS[pending.platform] || 0x5865F2;
    const embed = new EmbedBuilder()
      .setColor(platformColor)
      .setTitle('Challenge!')
      .setDescription(
        `<@${pending.opponentId}>, you have been challenged!\n\n` +
        `**Challenger:** <@${pending.challengerId}>\n` +
        `**Platform:** ${platformDisplay}\n` +
        `**Game:** ${gameDisplay}\n` +
        `**Type:** ${pending.matchType}\n` +
        `**Series:** Best of ${pending.bestOf}\n\n` +
        `**Maps:**\n${mapNames.map((m: string, i: number) => `Game ${i + 1}: ${m}`).join('\n')}`
      )
      .setFooter({ text: 'Waiting for response...' });

    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`chall_accept_${activeChallengeId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`chall_decline_${activeChallengeId}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger),
    );

    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({
        content: `<@${pending.opponentId}>`,
        embeds: [embed],
        components: [buttonRow],
      });
    }
  }
}

// Handle accept/decline buttons
export async function handleChallengeResponse(interaction: ButtonInteraction) {
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const activeChallengeId = parts.slice(2).join('_');

  const challenge = activeChallenges.get(activeChallengeId);

  if (!challenge) {
    await interaction.reply({ content: 'This challenge has expired or already been resolved.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== challenge.opponentId) {
    await interaction.reply({ content: 'Only the challenged player can accept or decline.', ephemeral: true });
    return;
  }

  const platformDisplay = PLATFORMS.find(p => p.value === challenge.platform)?.name || challenge.platform;
  const gameDisplay = GAMES.find(g => g.value === challenge.game)?.name || challenge.game;
  const mapNames = challenge.maps.map((m: string) => getMapName(challenge.game, m));
  const platformColor = PLATFORM_COLORS[challenge.platform] || 0x5865F2;

  if (action === 'accept') {
    // Check both users have accounts before creating the match
    const [challengerAccount, opponentAccount] = await Promise.all([
      api.getUserByDiscordId(challenge.challengerId).catch(() => null),
      api.getUserByDiscordId(challenge.opponentId).catch(() => null),
    ]);

    if (!challengerAccount) {
      await interaction.reply({
        content: `The challenger needs to create an account first. Sign in here: ${LOGIN_URL}`,
        ephemeral: true,
      });
      return;
    }

    if (!opponentAccount) {
      await interaction.reply({
        content: `You need to create an account before accepting! Sign in here: ${LOGIN_URL} then come back and click Accept.`,
        ephemeral: true,
      });
      return;
    }

    // Create the match and accept it in the backend
    let match: any;
    try {
      match = await api.createMatch({
        challengerDiscordId: challenge.challengerId,
        challengeeDiscordId: challenge.opponentId,
        game: challenge.game,
        platform: challenge.platform,
        type: challenge.matchType,
        bestOf: challenge.bestOf,
        selectedMaps: challenge.maps,
      });
      match = await api.acceptMatch(match.id, interaction.user.id);
    } catch (error: any) {
      const msg = error.message?.includes('already an active challenge')
        ? 'There is already an active challenge between you and this player for this game mode.'
        : `Failed to create match: ${error.message}`;
      await interaction.reply({ content: msg, ephemeral: true });
      return;
    }

    activeChallenges.delete(activeChallengeId);

    const embed = new EmbedBuilder()
      .setColor(platformColor)
      .setTitle('Challenge Accepted!')
      .setDescription(
        `**Challenger:** <@${challenge.challengerId}>\n` +
        `**Opponent:** <@${challenge.opponentId}>\n` +
        `**Platform:** ${platformDisplay}\n` +
        `**Game:** ${gameDisplay}\n` +
        `**Type:** ${challenge.matchType}\n` +
        `**Series:** Best of ${challenge.bestOf}\n\n` +
        `**Maps:**\n${mapNames.map((m: string, i: number) => `Game ${i + 1}: ${m}`).join('\n')}`
      )
      .setFooter({ text: 'Report results at 1v1leaderboards.com' });

    const viewRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('View Match')
        .setStyle(ButtonStyle.Link)
        .setURL(`${FRONTEND_URL}/matches/${match.id}`),
    );

    await interaction.update({
      content: '',
      embeds: [embed],
      components: [viewRow],
    });
  } else if (action === 'decline') {
    activeChallenges.delete(activeChallengeId);

    const embed = new EmbedBuilder()
      .setColor(0x72767d)
      .setTitle('Challenge Declined')
      .setDescription(
        `<@${challenge.opponentId}> declined the challenge from <@${challenge.challengerId}>.`
      );

    await interaction.update({
      content: '',
      embeds: [embed],
      components: [],
    });
  }
}

export { pendingChallenges, activeChallenges };
