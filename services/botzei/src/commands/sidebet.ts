import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalSubmitInteraction,
} from 'discord.js';
import {
  getGuildSetup,
  createSidebet,
  acceptSidebet,
  lockSidebet,
  cancelSidebet,
  Sidebet,
} from '../sidebets/sidebet-manager.js';

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  status: string;
  isBye: boolean;
  player1: { id: string; username: string } | null;
  player2: { id: string; username: string } | null;
  winner: { id: string; username: string } | null;
  gameMaps: { id: string; mapName: string }[];
  scheduledTime: string | null;
}

interface BracketResponse {
  tournament: { id: string; slug: string; name: string; status: string; game: { id: string; name: string }; platform: { id: string; name: string } };
  matches: BracketMatch[];
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Cache bracket data for match lookups
const bracketCache = new Map<string, { matches: BracketMatch[]; totalRounds: number }>();

// Pending match selection: after user picks a match, store it keyed by oduserId
const pendingMatchSelection = new Map<string, {
  guildId: string;
  tournamentId: string;
  matchId: string;
  matchLabel: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}>();

// Pending bets: user picked match + player, waiting for amount modal
const pendingBets = new Map<string, {
  guildId: string;
  tournamentId: string;
  matchId: string;
  pickedPlayerId: string;
  pickedPlayerName: string;
  matchLabel: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
}>();

function canManage(interaction: { guild?: { ownerId: string } | null; user: { id: string }; member: any }): boolean {
  if (!interaction.guild || !interaction.member) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const roles = interaction.member.roles?.cache;
  if (roles?.some?.((r: any) => r.name.toLowerCase() === 'dot')) return true;
  return false;
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === 1) return 'Grand Finals';
  if (round === 2) return 'Semi-Finals';
  if (round === 3) return 'Quarter-Finals';
  const roundFromStart = totalRounds - round + 1;
  return `Round ${roundFromStart}`;
}

const STATUS_COLORS: Record<string, number> = {
  OPEN: 0x22D3EE,
  ACCEPTED: 0xF59E0B,
  LOCKED: 0x10B981,
  CANCELLED: 0x64748B,
};

const STATUS_EMOJI: Record<string, string> = {
  OPEN: '🔵',
  ACCEPTED: '🟡',
  LOCKED: '🟢',
  CANCELLED: '⚫',
};

function buildSidebetEmbed(bet: Sidebet): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
  const otherPlayerName = bet.pickedPlayerId === bet.player1Id ? bet.player2Name : bet.player1Name;

  let description = `**${bet.player1Name}** vs **${bet.player2Name}**\n${bet.matchLabel}\n\n`;
  description += `<@${bet.creatorDiscordId}> — **$${bet.amount}** on **${bet.pickedPlayerName}**\n`;

  if (bet.acceptorDiscordId) {
    description += `<@${bet.acceptorDiscordId}> — **$${bet.amount}** on **${bet.acceptorPickedPlayerName}**\n`;
  }

  description += '\n';

  switch (bet.status) {
    case 'OPEN':
      description += `${STATUS_EMOJI.OPEN} **Open** — Waiting for someone to take **${otherPlayerName}**`;
      break;
    case 'ACCEPTED':
      description += `${STATUS_EMOJI.ACCEPTED} **Accepted** — Waiting for lock-in`;
      break;
    case 'LOCKED':
      description += `${STATUS_EMOJI.LOCKED} **Locked In**`;
      break;
    case 'CANCELLED':
      description += `${STATUS_EMOJI.CANCELLED} **Cancelled**`;
      break;
  }

  const embed = new EmbedBuilder()
    .setColor(STATUS_COLORS[bet.status])
    .setTitle(`Sidebet #${bet.id}`)
    .setDescription(description)
    .setTimestamp(bet.createdAt);

  const buttons: ButtonBuilder[] = [];

  if (bet.status === 'OPEN') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`sidebet_accept_${bet.id}`)
        .setLabel(`Accept — $${bet.amount} on ${otherPlayerName}`)
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`sidebet_cancel_${bet.id}`)
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary),
    );
  } else if (bet.status === 'ACCEPTED') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`sidebet_lock_${bet.id}`)
        .setLabel('Lock In')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔒'),
    );
  }

  const components = buttons.length > 0
    ? [new ActionRowBuilder<ButtonBuilder>().addComponents(buttons)]
    : [];

  return { embeds: [embed], components };
}

// ── Button: "Create Sidebet" on the setup card ──

export async function handleSidebetCreateButton(interaction: ButtonInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This can only be used in a server.', ephemeral: true });
    return;
  }

  const setup = getGuildSetup(guildId);
  if (!setup) {
    await interaction.reply({ content: 'Sidebets are not set up. An admin needs to run `/sidebet-setup` first.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const res = await fetch(`${BACKEND_URL}/tournaments/${setup.tournamentId}/bracket`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = (await res.json()) as BracketResponse;
    const { matches } = data;
    const totalRounds = Math.max(...matches.map(m => m.round));

    bracketCache.set(setup.tournamentId, { matches, totalRounds });

    const playable = matches
      .filter(m => !m.isBye && (m.status === 'READY' || m.status === 'IN_PROGRESS') && m.player1 && m.player2)
      .sort((a, b) => b.round - a.round || a.matchNumber - b.matchNumber);

    if (playable.length === 0) {
      await interaction.editReply({ content: 'No active matches to bet on right now.' });
      return;
    }

    const options = playable.slice(0, 25).map(m => {
      const roundName = getRoundName(m.round, totalRounds);
      const p1 = m.player1!.username;
      const p2 = m.player2!.username;
      return {
        label: `${p1} vs ${p2}`.slice(0, 100),
        description: `Match ${m.matchNumber} — ${roundName}`.slice(0, 100),
        value: `${setup.tournamentId}:${m.id}`,
      };
    });

    const select = new StringSelectMenuBuilder()
      .setCustomId(`sidebet_match_${interaction.user.id}`)
      .setPlaceholder('Pick a match to bet on')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

    const embed = new EmbedBuilder()
      .setColor(0x22D3EE)
      .setTitle(`${setup.tournamentName} — Create Sidebet`)
      .setDescription('Select a match to place your bet on:');

    await interaction.editReply({ embeds: [embed], components: [row] });
  } catch (error) {
    console.error('Error in sidebet create:', error);
    await interaction.editReply({ content: 'Failed to fetch matches.' });
  }
}

// ── Select menu: user picks a match ──

export async function handleSidebetMatchSelect(interaction: StringSelectMenuInteraction) {
  const userId = interaction.customId.replace('sidebet_match_', '');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This menu is not for you.', ephemeral: true });
    return;
  }

  await interaction.deferUpdate();

  const [tournamentId, matchId] = interaction.values[0].split(':');

  let cached = bracketCache.get(tournamentId);
  if (!cached) {
    try {
      const res = await fetch(`${BACKEND_URL}/tournaments/${tournamentId}/bracket`);
      if (!res.ok) throw new Error(`API error`);
      const data = (await res.json()) as BracketResponse;
      const totalRounds = Math.max(...data.matches.map(m => m.round));
      cached = { matches: data.matches, totalRounds };
      bracketCache.set(tournamentId, cached);
    } catch {
      await interaction.editReply({ content: 'Failed to fetch match data.', embeds: [], components: [] });
      return;
    }
  }

  const match = cached.matches.find(m => m.id === matchId);
  if (!match || !match.player1 || !match.player2) {
    await interaction.editReply({ content: 'Match not found or players not set.', embeds: [], components: [] });
    return;
  }

  const roundName = getRoundName(match.round, cached.totalRounds);
  const matchLabel = `Match ${match.matchNumber} — ${roundName}`;

  // Store match selection in memory (avoids long custom IDs)
  pendingMatchSelection.set(userId, {
    guildId: interaction.guildId!,
    tournamentId,
    matchId,
    matchLabel,
    player1Id: match.player1.id,
    player1Name: match.player1.username,
    player2Id: match.player2.id,
    player2Name: match.player2.username,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`sb_pick_${userId}_p1`)
      .setLabel(match.player1.username)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`sb_pick_${userId}_p2`)
      .setLabel(match.player2.username)
      .setStyle(ButtonStyle.Danger),
  );

  const embed = new EmbedBuilder()
    .setColor(0x22D3EE)
    .setTitle(matchLabel)
    .setDescription(`**${match.player1.username}** vs **${match.player2.username}**\n\nWho are you betting on?`);

  await interaction.editReply({ embeds: [embed], components: [row] });
}

// ── Button: user picks a player → show amount modal ──

export async function handleSidebetPlayerPick(interaction: ButtonInteraction) {
  // Format: sb_pick_{userId}_{p1|p2}
  const parts = interaction.customId.split('_');
  const userId = parts[2];
  const pick = parts[3]; // 'p1' or 'p2'

  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This button is not for you.', ephemeral: true });
    return;
  }

  const selection = pendingMatchSelection.get(userId);
  if (!selection) {
    await interaction.reply({ content: 'Session expired. Click **Create Sidebet** again.', ephemeral: true });
    return;
  }

  const pickedPlayerId = pick === 'p1' ? selection.player1Id : selection.player2Id;
  const pickedPlayerName = pick === 'p1' ? selection.player1Name : selection.player2Name;

  pendingMatchSelection.delete(userId);

  // Store pending bet state for the amount modal
  pendingBets.set(interaction.user.id, {
    guildId: selection.guildId,
    tournamentId: selection.tournamentId,
    matchId: selection.matchId,
    pickedPlayerId,
    pickedPlayerName,
    matchLabel: selection.matchLabel,
    player1Id: selection.player1Id,
    player1Name: selection.player1Name,
    player2Id: selection.player2Id,
    player2Name: selection.player2Name,
  });

  // Show modal for amount (must NOT defer before showing modal)
  const modal = new ModalBuilder()
    .setCustomId(`sidebet_amount_${interaction.user.id}`)
    .setTitle(`Bet on ${pickedPlayerName}`);

  const amountInput = new TextInputBuilder()
    .setCustomId('amount')
    .setLabel('Bet amount ($)')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('e.g. 50')
    .setRequired(true)
    .setMinLength(1)
    .setMaxLength(10);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(amountInput));
  await interaction.showModal(modal);
}

// ── Modal submit: amount entered → create sidebet → post in sidebet channel ──

export async function handleSidebetAmountModal(interaction: ModalSubmitInteraction) {
  const userId = interaction.customId.replace('sidebet_amount_', '');
  if (interaction.user.id !== userId) return;

  const pending = pendingBets.get(userId);
  if (!pending) {
    await interaction.reply({ content: 'Bet session expired. Click **Create Sidebet** again.', ephemeral: true });
    return;
  }

  const rawAmount = interaction.fields.getTextInputValue('amount').trim();
  const amount = parseFloat(rawAmount.replace(/[^0-9.]/g, ''));

  if (isNaN(amount) || amount <= 0) {
    await interaction.reply({ content: 'Invalid amount. Enter a positive number.', ephemeral: true });
    return;
  }

  const finalAmount = Math.round(amount * 100) / 100;
  pendingBets.delete(userId);

  const setup = getGuildSetup(pending.guildId);

  const bet = createSidebet({
    guildId: pending.guildId,
    tournamentId: pending.tournamentId,
    matchId: pending.matchId,
    creatorDiscordId: interaction.user.id,
    creatorName: interaction.user.displayName || interaction.user.username,
    pickedPlayerId: pending.pickedPlayerId,
    pickedPlayerName: pending.pickedPlayerName,
    amount: finalAmount,
    matchLabel: pending.matchLabel,
    player1Id: pending.player1Id,
    player1Name: pending.player1Name,
    player2Id: pending.player2Id,
    player2Name: pending.player2Name,
  });

  // Ephemeral confirmation to creator
  await interaction.reply({
    content: `Sidebet #${bet.id} created! **$${finalAmount}** on **${bet.pickedPlayerName}**.`,
    ephemeral: true,
  });

  // Post public embed in the sidebet channel
  const { embeds, components } = buildSidebetEmbed(bet);
  const channelId = setup?.channelId || interaction.channelId || '';
  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (channel && channel.isSendable()) {
      await channel.send({ embeds, components });
    }
  } catch (err) {
    console.error('Failed to post sidebet to channel:', err);
  }
}

// ── Button: Accept sidebet ──

export async function handleSidebetAccept(interaction: ButtonInteraction) {
  const betId = parseInt(interaction.customId.replace('sidebet_accept_', ''), 10);
  const result = acceptSidebet(betId, interaction.user.id, interaction.user.displayName || interaction.user.username);

  if (typeof result === 'string') {
    await interaction.reply({ content: result, ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  const { embeds, components } = buildSidebetEmbed(result);
  await interaction.editReply({ embeds, components });
}

// ── Button: Lock sidebet ──

export async function handleSidebetLock(interaction: ButtonInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can lock sidebets.', ephemeral: true });
    return;
  }

  const betId = parseInt(interaction.customId.replace('sidebet_lock_', ''), 10);
  const result = lockSidebet(betId);

  if (typeof result === 'string') {
    await interaction.reply({ content: result, ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  const { embeds, components } = buildSidebetEmbed(result);
  await interaction.editReply({ embeds, components });
}

// ── Button: Cancel sidebet ──

export async function handleSidebetCancel(interaction: ButtonInteraction) {
  const betId = parseInt(interaction.customId.replace('sidebet_cancel_', ''), 10);
  const result = cancelSidebet(betId, interaction.user.id);

  if (typeof result === 'string') {
    await interaction.reply({ content: result, ephemeral: true });
    return;
  }

  await interaction.deferUpdate();
  const { embeds, components } = buildSidebetEmbed(result);
  await interaction.editReply({ embeds, components });
}
