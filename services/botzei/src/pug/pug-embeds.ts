import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { PugPlayer } from './pug-queue.js';
import type { PugMatch } from './pug-match.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:4200';
const ACCENT = 0x3498db;
const GREEN = 0x22C55E;
const YELLOW = 0xF59E0B;
const RED = 0xEF4444;

export function buildLobbyEmbed(players: PugPlayer[], name: string) {
  const description =
    `### ${name}\n\n` +
    `**${players.length}/2** players queued`;

  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setDescription(description)
    .setFooter({ text: '1v1leaderboards.com                                              \u200E' });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('pug_join')
      .setLabel('Join')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('pug_leave')
      .setLabel('Leave')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Leaderboards')
      .setStyle(ButtonStyle.Link)
      .setURL(FRONTEND_URL),
  );

  return { embeds: [embed], components: [row] };
}

export function buildReadyUpEmbed(match: PugMatch) {
  const p1Status = match.player1Ready ? '✅' : '⬜';
  const p2Status = match.player2Ready ? '✅' : '⬜';

  const embed = new EmbedBuilder()
    .setColor(YELLOW)
    .setDescription(
      `### ${match.queueName} — Ready Up\n\n` +
      `${p1Status} <@${match.player1.discordId}>\n` +
      `${p2Status} <@${match.player2.discordId}>\n\n` +
      `*Expires <t:${match.readyDeadline}:R>*`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pug_ready_${match.id}`)
      .setLabel('Ready')
      .setStyle(ButtonStyle.Success),
  );

  return { embeds: [embed], components: [row] };
}

export function buildMapPickEmbed(match: PugMatch) {
  const p1Picked = match.player1MapPick ? '✅' : '⬜';
  const p2Picked = match.player2MapPick ? '✅' : '⬜';

  const embed = new EmbedBuilder()
    .setColor(ACCENT)
    .setDescription(
      `### ${match.queueName} — Pick Your Map\n\n` +
      `${p1Picked} <@${match.player1.discordId}>\n` +
      `${p2Picked} <@${match.player2.discordId}>\n\n` +
      `*Select the map you want to play. One will be chosen at random.*`,
    );

  const options = match.maps.map(m => ({ label: m, value: m }));

  const select = new StringSelectMenuBuilder()
    .setCustomId(`pug_map_${match.id}`)
    .setPlaceholder('Choose your map')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  return { embeds: [embed], components: [row] };
}

export function buildMapResultEmbed(match: PugMatch) {
  const p1Pick = match.player1MapPick!;
  const p2Pick = match.player2MapPick!;
  const same = p1Pick === p2Pick;

  let pickText: string;
  if (same) {
    pickText = `Both players picked **${p1Pick}**!`;
  } else {
    pickText =
      `<@${match.player1.discordId}> picked **${p1Pick}**\n` +
      `<@${match.player2.discordId}> picked **${p2Pick}**`;
  }

  const embed = new EmbedBuilder()
    .setColor(GREEN)
    .setDescription(
      `### ${match.queueName} — Map Selected\n\n` +
      `${pickText}\n\n` +
      `**Playing on: ${match.chosenMap}**\n\n` +
      `*Good luck! Report the result when finished.*`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pug_rp1_${match.id}`)
      .setLabel(`${match.player1.username} Won`)
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`pug_rp2_${match.id}`)
      .setLabel(`${match.player2.username} Won`)
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export function buildReportPendingEmbed(match: PugMatch) {
  const winnerName = match.reportedWinner === match.player1.discordId
    ? match.player1.username : match.player2.username;
  const otherPlayer = match.reportedBy === match.player1.discordId
    ? match.player2 : match.player1;

  const embed = new EmbedBuilder()
    .setColor(YELLOW)
    .setDescription(
      `### ${match.queueName} — Confirm Result\n\n` +
      `<@${match.reportedBy}> reported **${winnerName}** as the winner.\n\n` +
      `<@${otherPlayer.discordId}>, confirm the result.`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pug_confirm_${match.id}`)
      .setLabel('Confirm')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`pug_dispute_${match.id}`)
      .setLabel('Dispute')
      .setStyle(ButtonStyle.Danger),
  );

  return { embeds: [embed], components: [row] };
}

export function buildMatchCompleteEmbed(match: PugMatch) {
  const winnerName = match.reportedWinner === match.player1.discordId
    ? match.player1.username : match.player2.username;

  const embed = new EmbedBuilder()
    .setColor(GREEN)
    .setDescription(
      `### ${match.queueName} — Match Complete\n\n` +
      `**${winnerName}** wins on **${match.chosenMap}**!\n\n` +
      `<@${match.player1.discordId}> vs <@${match.player2.discordId}>`,
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pug_rematch_${match.id}`)
      .setLabel('Rematch')
      .setStyle(ButtonStyle.Primary),
  );

  return { embeds: [embed], components: [row] };
}

export function buildDisputeEmbed(match: PugMatch) {
  const embed = new EmbedBuilder()
    .setColor(RED)
    .setDescription(
      `### ${match.queueName} — Disputed\n\n` +
      `<@${match.player1.discordId}> vs <@${match.player2.discordId}>\n\n` +
      `*Result disputed. A server admin will need to resolve this.*`,
    );

  return { embeds: [embed], components: [] };
}

export function buildReadyExpiredEmbed(match: PugMatch, notReadyIds: string[]) {
  const embed = new EmbedBuilder()
    .setColor(RED)
    .setDescription(
      `### ${match.queueName} — Ready Up Expired\n\n` +
      `${notReadyIds.map(id => `<@${id}>`).join(', ')} didn't ready up.`,
    );

  return { embeds: [embed], components: [] };
}
