import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  EmbedBuilder,
} from 'discord.js';
import {
  getQueue,
  createQueue,
  deleteQueue,
  addPlayer,
  removePlayer,
  clearPlayers,
} from '../pug/pug-queue.js';
import {
  createMatch,
  getMatch,
  getActiveMatchForPlayer,
  deleteMatch,
  setReady,
  setMapPick,
  reportResult,
  resetForRematch,
  MATCHES_CHANNEL_ID,
  RESULTS_CHANNEL_ID,
} from '../pug/pug-match.js';
import {
  buildLobbyEmbed,
  buildReadyUpEmbed,
  buildMapPickEmbed,
  buildMapResultEmbed,
  buildReportPendingEmbed,
  buildMatchCompleteEmbed,
  buildDisputeEmbed,
  buildReadyExpiredEmbed,
} from '../pug/pug-embeds.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY || '';

export const data = new SlashCommandBuilder()
  .setName('pug')
  .setDescription('Manage PUG (pickup game) queues')
  .addSubcommand(sub =>
    sub.setName('setup').setDescription('Post a queue in this channel')
      .addStringOption(opt =>
        opt.setName('name').setDescription('Queue name').setRequired(true),
      )
      .addStringOption(opt =>
        opt.setName('maps').setDescription('Comma-separated map list (e.g. Midship,Lockout,Sanctuary)').setRequired(true),
      )
      .addStringOption(opt =>
        opt.setName('leaderboard').setDescription('Leaderboard ID to track XP').setRequired(true),
      ),
  )
  .addSubcommand(sub =>
    sub.setName('remove').setDescription('Remove the queue from this channel'),
  )
  .addSubcommand(sub =>
    sub.setName('wipe').setDescription('Delete all queue messages in this channel'),
  );

function canManage(interaction: { guild?: { ownerId: string } | null; user: { id: string }; member: any }): boolean {
  if (!interaction.guild || !interaction.member) return false;
  if (interaction.guild.ownerId === interaction.user.id) return true;
  const roles = interaction.member.roles?.cache;
  if (roles?.some?.((r: any) => r.name.toLowerCase() === 'dot')) return true;
  return false;
}

function parseMatchId(customId: string): number {
  const parts = customId.split('_');
  return parseInt(parts[parts.length - 1], 10);
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'setup') {
    await handleSetup(interaction);
  } else if (subcommand === 'remove') {
    await handleRemove(interaction);
  } else if (subcommand === 'wipe') {
    await handleWipe(interaction);
  }
}

async function handleSetup(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  const existing = getQueue(interaction.channelId);
  if (existing) {
    await interaction.reply({ content: 'A queue already exists in this channel.', ephemeral: true });
    return;
  }

  const channel = interaction.channel as any;
  if (!channel?.send) {
    await interaction.reply({ content: 'Cannot send messages in this channel.', ephemeral: true });
    return;
  }

  const queueName = interaction.options.getString('name', true);
  const mapsRaw = interaction.options.getString('maps', true);
  const maps = mapsRaw.split(',').map(m => m.trim()).filter(Boolean);
  const leaderboardId = interaction.options.getString('leaderboard', true);

  if (maps.length < 2) {
    await interaction.reply({ content: 'You need at least 2 maps.', ephemeral: true });
    return;
  }

  // Verify leaderboard exists
  try {
    const res = await fetch(`${BACKEND_URL}/leaderboards/${leaderboardId}`);
    if (!res.ok) {
      await interaction.reply({ content: 'Invalid leaderboard ID.', ephemeral: true });
      return;
    }
  } catch {
    await interaction.reply({ content: 'Could not verify leaderboard.', ephemeral: true });
    return;
  }

  const lobbyData = buildLobbyEmbed([], queueName);
  const lobbyMessage = await channel.send(lobbyData);
  createQueue(interaction.channelId, lobbyMessage.id, queueName, maps, leaderboardId);

  await interaction.reply({ content: 'Queue created!', ephemeral: true });
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  const existing = getQueue(interaction.channelId);
  if (!existing) {
    await interaction.reply({ content: 'No queue in this channel.', ephemeral: true });
    return;
  }

  try {
    const channel = interaction.channel as any;
    const msg = await channel.messages.fetch(existing.messageId);
    await msg.delete();
  } catch { /* already gone */ }

  deleteQueue(interaction.channelId);
  await interaction.reply({ content: 'Queue removed.', ephemeral: true });
}

async function handleWipe(interaction: ChatInputCommandInteraction) {
  if (!canManage(interaction)) {
    await interaction.reply({ content: 'Only the server owner or the **dot** role can use this.', ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as any;
  if (!channel?.messages) {
    await interaction.editReply({ content: 'Cannot access messages in this channel.' });
    return;
  }

  const existing = getQueue(interaction.channelId);
  if (existing) {
    deleteQueue(interaction.channelId);
  }

  let deleted = 0;
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter((m: any) =>
      m.author.id === interaction.client.user?.id &&
      (m.embeds.length > 0 || m.components.length > 0),
    );

    for (const [, msg] of botMessages) {
      try {
        await msg.delete();
        deleted++;
      } catch { /* already gone */ }
    }
  } catch { /* permission issue */ }

  await interaction.editReply({ content: `Wiped ${deleted} message${deleted === 1 ? '' : 's'}.` });
}

// --- Button Handlers ---

export async function handlePugJoin(interaction: ButtonInteraction) {
  const queue = getQueue(interaction.channelId);
  if (!queue) {
    await interaction.reply({ content: 'No active queue in this channel.', ephemeral: true });
    return;
  }

  const activeMatch = getActiveMatchForPlayer(interaction.user.id);
  if (activeMatch) {
    await interaction.reply({
      content: `You have an active match in <#${MATCHES_CHANNEL_ID}>. Finish it first.`,
      ephemeral: true,
    });
    return;
  }

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const displayName = member?.nickname || interaction.user.username;

  // Ensure user has a website account (background, don't block)
  ensureAccount(interaction.user.id, displayName).catch(() => {});

  const result = addPlayer(interaction.channelId, {
    discordId: interaction.user.id,
    username: displayName,
  });

  if (!result.added) {
    await interaction.reply({ content: "You're already in the queue.", ephemeral: true });
    return;
  }

  if (result.isFull) {
    const [p1, p2] = result.players;

    clearPlayers(interaction.channelId);
    await updateLobby(interaction);
    await interaction.deferUpdate();

    await startMatch(interaction, queue.name, queue.leaderboardId, queue.maps, p1, p2);
  } else {
    await updateLobby(interaction);
    await interaction.deferUpdate();
  }
}

export async function handlePugLeave(interaction: ButtonInteraction) {
  const queue = getQueue(interaction.channelId);
  if (!queue) {
    await interaction.reply({ content: 'No active queue in this channel.', ephemeral: true });
    return;
  }

  const result = removePlayer(interaction.channelId, interaction.user.id);

  if (!result.removed) {
    await interaction.reply({ content: "You're not in the queue.", ephemeral: true });
    return;
  }

  await updateLobby(interaction);
  await interaction.deferUpdate();
}

export async function handlePugReady(interaction: ButtonInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'READY_UP') {
    await interaction.reply({ content: 'No active ready check.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  const result = setReady(matchId, interaction.user.id);

  if (result.alreadyReady) {
    await interaction.reply({ content: "You're already ready.", ephemeral: true });
    return;
  }

  if (result.bothReady) {
    match.phase = 'MAP_PICK';
    const mapPickData = buildMapPickEmbed(match);
    await interaction.update(mapPickData);
  } else {
    const readyData = buildReadyUpEmbed(match);
    await interaction.update(readyData);
  }
}

export async function handlePugMapPick(interaction: StringSelectMenuInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'MAP_PICK') {
    await interaction.reply({ content: 'No active map pick.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  const selectedMap = interaction.values[0];
  const result = setMapPick(matchId, interaction.user.id, selectedMap);

  if (result.alreadyPicked) {
    await interaction.reply({ content: "You've already picked a map.", ephemeral: true });
    return;
  }

  if (result.bothPicked) {
    const resultData = buildMapResultEmbed(match);
    await interaction.update(resultData);
  } else {
    const mapPickData = buildMapPickEmbed(match);
    await interaction.update(mapPickData);
  }
}

export async function handlePugReport(interaction: ButtonInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'IN_PROGRESS') {
    if (match?.phase === 'REPORTING') {
      await interaction.reply({ content: 'Result already reported. Waiting for confirmation.', ephemeral: true });
      return;
    }
    await interaction.reply({ content: 'No active match to report.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  const isP1 = interaction.customId.startsWith('pug_rp1_');
  const winnerId = isP1 ? match.player1.discordId : match.player2.discordId;
  const result = reportResult(matchId, interaction.user.id, winnerId);

  if (!result.reported) {
    await interaction.reply({ content: 'Could not report result.', ephemeral: true });
    return;
  }

  const pendingData = buildReportPendingEmbed(match);
  await interaction.update(pendingData);
}

export async function handlePugConfirm(interaction: ButtonInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'REPORTING') {
    await interaction.reply({ content: 'Nothing to confirm.', ephemeral: true });
    return;
  }

  if (interaction.user.id === match.reportedBy) {
    await interaction.reply({ content: 'You reported the result. The other player needs to confirm.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  const result = reportResult(matchId, interaction.user.id, match.reportedWinner!);

  if (result.confirmed) {
    const completeData = buildMatchCompleteEmbed(match);
    await interaction.update(completeData);

    // Post result to results channel
    try {
      const resultsChannel = await interaction.client.channels.fetch(RESULTS_CHANNEL_ID);
      if (resultsChannel && 'send' in resultsChannel) {
        const winnerName = match.reportedWinner === match.player1.discordId
          ? match.player1.username : match.player2.username;
        const resultEmbed = new EmbedBuilder()
          .setColor(0x22C55E)
          .setDescription(
            `### ${match.queueName} — Result\n\n` +
            `**${winnerName}** wins on **${match.chosenMap}**\n\n` +
            `<@${match.player1.discordId}> vs <@${match.player2.discordId}>`,
          );
        await (resultsChannel as any).send({ embeds: [resultEmbed] });
      }
    } catch (err) {
      console.error('[PUG] Error posting result:', err);
    }

    // Record match + award XP on backend
    completeMatchOnBackend(match).catch(err =>
      console.error('[PUG] Error completing match on backend:', err),
    );
  }
}

export async function handlePugDispute(interaction: ButtonInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'REPORTING') {
    await interaction.reply({ content: 'Nothing to dispute.', ephemeral: true });
    return;
  }

  if (interaction.user.id === match.reportedBy) {
    await interaction.reply({ content: 'You reported the result. The other player needs to respond.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  match.phase = 'DONE';
  const disputeData = buildDisputeEmbed(match);
  await interaction.update(disputeData);
}

export async function handlePugRematch(interaction: ButtonInteraction) {
  const matchId = parseMatchId(interaction.customId);
  const match = getMatch(matchId);
  if (!match || match.phase !== 'DONE') {
    await interaction.reply({ content: 'No match to rematch.', ephemeral: true });
    return;
  }

  if (interaction.user.id !== match.player1.discordId && interaction.user.id !== match.player2.discordId) {
    await interaction.reply({ content: 'This match is not for you.', ephemeral: true });
    return;
  }

  const reset = resetForRematch(matchId);
  if (!reset) {
    await interaction.reply({ content: 'Could not start rematch.', ephemeral: true });
    return;
  }

  const mapPickData = buildMapPickEmbed(reset);
  await interaction.update(mapPickData);
}

// --- Helpers ---

async function updateLobby(interaction: ButtonInteraction) {
  const queue = getQueue(interaction.channelId);
  if (!queue) return;

  const channel = interaction.channel as any;

  try {
    const msg = await channel.messages.fetch(queue.messageId);
    const lobbyData = buildLobbyEmbed(queue.players, queue.name);
    await msg.edit(lobbyData);
  } catch { /* message gone */ }
}

async function ensureAccount(discordId: string, username: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/users/by-discord/${discordId}`);
    const user = await res.json();
    if (user) return; // already exists

    await fetch(`${BACKEND_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ discordId, username }),
    });
  } catch (err) {
    console.error('[PUG] Error ensuring account:', err);
  }
}

async function completeMatchOnBackend(match: ReturnType<typeof getMatch>) {
  if (!match) return;
  try {
    await fetch(`${BACKEND_URL}/matches/bot/complete-match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
      body: JSON.stringify({
        challengerDiscordId: match.player1.discordId,
        challengeeDiscordId: match.player2.discordId,
        winnerDiscordId: match.reportedWinner,
        leaderboardId: match.leaderboardId,
        map: match.chosenMap,
      }),
    });
  } catch (err) {
    console.error('[PUG] Error completing match on backend:', err);
  }
}

async function startMatch(
  interaction: ButtonInteraction,
  queueName: string,
  leaderboardId: string,
  maps: string[],
  p1: { discordId: string; username: string },
  p2: { discordId: string; username: string },
) {
  try {
    const matchesChannel = await interaction.client.channels.fetch(MATCHES_CHANNEL_ID);
    if (!matchesChannel || !('send' in matchesChannel)) return;

    const match = createMatch(interaction.channelId, queueName, leaderboardId, maps, p1, p2);

    const readyData = buildReadyUpEmbed(match);
    const readyMsg = await (matchesChannel as any).send({
      content: `<@${p1.discordId}> <@${p2.discordId}>`,
      ...readyData,
    });
    match.messageId = readyMsg.id;

    // Ready-up timeout
    match.readyTimeout = setTimeout(async () => {
      const current = getMatch(match.id);
      if (!current || current.phase !== 'READY_UP') return;

      const notReadyIds: string[] = [];
      if (!current.player1Ready) notReadyIds.push(current.player1.discordId);
      if (!current.player2Ready) notReadyIds.push(current.player2.discordId);

      const readyPlayer = current.player1Ready ? current.player1 : current.player2Ready ? current.player2 : null;

      // Update the embed to expired state
      if (current.messageId) {
        try {
          const msg = await (matchesChannel as any).messages.fetch(current.messageId);
          const expiredData = buildReadyExpiredEmbed(current, notReadyIds);
          await msg.edit(expiredData);
        } catch { /* message gone */ }
      }

      deleteMatch(match.id);

      // Add the ready player back to queue
      if (readyPlayer) {
        const queue = getQueue(interaction.channelId);
        if (queue) {
          addPlayer(interaction.channelId, readyPlayer);
          try {
            const queueChannel = interaction.channel as any;
            const queueMsg = await queueChannel.messages.fetch(queue.messageId);
            const lobbyData = buildLobbyEmbed(queue.players, queue.name);
            await queueMsg.edit(lobbyData);
          } catch { /* message gone */ }
        }
      }
    }, 300_000);
  } catch (err) {
    console.error('[PUG] Error creating match:', err);
  }
}
