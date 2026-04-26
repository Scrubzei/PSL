/**
 * Plutonium queue embed and button builders.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PlutoMatch, PlutoQueue } from './types.js';
import { getState } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLATFORM_COLORS: Record<string, number> = {
  plutonium: 0xbf2120,
  iw4x: 0x7c3aed,
  xbox: 0x107c10,
  ps3: 0x003791,
};

const GAME_BANNERS: Record<string, string> = {
  mw2: 'mw2-banner.png',
  bo2: 'bo2-banner.png',
  mw2019: 'mw2019-banner.jpg',
  'mw 2019': 'mw2019-banner.jpg',
};

function platformColor(platform: string): number {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? 0x2563eb;
}

function getBannerAttachment(game: string): AttachmentBuilder {
  const slug = game.toLowerCase();
  const file = GAME_BANNERS[slug] ?? 'mw2-banner.png';
  return new AttachmentBuilder(
    join(__dirname, '..', 'assets', file),
    { name: 'banner.png' },
  );
}

// ---------------------------------------------------------------------------
// Queue card
// ---------------------------------------------------------------------------

export function buildQueueEmbed(queue: PlutoQueue): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const state = getState();
  const matchesToday = state.matches.filter((m) => {
    if (!m.completedAt) return false;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return m.completedAt >= start.getTime();
  }).length;

  const queueStatus =
    queue.players.length === 0
      ? '_No one in queue. Be the first!_'
      : queue.players.length === 1
        ? '_Searching for opponent..._'
        : `_${queue.players.length} players in queue_`;

  const embed = new EmbedBuilder()
    .setTitle(queue.title)
    .setColor(platformColor(queue.platform))
    .setImage('attachment://banner.png')
    .addFields(
      { name: 'Game', value: queue.game, inline: true },
      { name: 'Platform', value: queue.platform, inline: true },
      { name: 'Queue', value: `**${queue.players.length}** / 2`, inline: true },
      { name: 'Map Pool', value: queue.maps.join('  ·  ') },
      { name: 'Status', value: queueStatus },
    );

  const footerParts = ['Click Join Queue to play'];
  if (matchesToday > 0) {
    footerParts.push(`${matchesToday} match${matchesToday === 1 ? '' : 'es'} today`);
  }
  embed.setFooter({ text: footerParts.join('  ·  ') });

  return { embed, files: [getBannerAttachment(queue.game)] };
}

export function buildQueueButtons(queue: PlutoQueue): ActionRowBuilder<ButtonBuilder>[] {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const gameSlug = encodeURIComponent(queue.game.toLowerCase());
  const platformSlug = encodeURIComponent(queue.platform.toLowerCase());

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pq:join:${queue.id}`)
      .setLabel('Join Queue')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`pq:leave:${queue.id}`)
      .setLabel('Leave Queue')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Stats')
      .setStyle(ButtonStyle.Link)
      .setURL(`${frontendUrl}/leaderboards/${gameSlug}/${platformSlug}?tab=elo`)
      .setEmoji('📊'),
  )];
}

// ---------------------------------------------------------------------------
// Ready-up
// ---------------------------------------------------------------------------

export function buildReadyUpEmbed(match: PlutoMatch): EmbedBuilder {
  const expiresEpoch = Math.floor((match.readyUpExpiresAt ?? 0) / 1000);
  const p1Status = match.player1.ready ? '✅ Ready' : '⏳ Waiting';
  const p2Status = match.player2.ready ? '✅ Ready' : '⏳ Waiting';

  return new EmbedBuilder()
    .setTitle(`Match Found — ${match.title}`)
    .setColor(platformColor(match.platform))
    .setDescription(
      `<@${match.player1.discordId}>  **vs**  <@${match.player2.discordId}>\n\n` +
      `Both players must ready up before the timer runs out.`,
    )
    .addFields(
      { name: match.player1.username, value: p1Status, inline: true },
      { name: match.player2.username, value: p2Status, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Game', value: match.game, inline: true },
      { name: 'Platform', value: match.platform, inline: true },
      { name: 'Expires', value: `<t:${expiresEpoch}:R>`, inline: true },
    );
}

export function buildReadyUpRow(match: PlutoMatch): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pq:ready:${match.id}`)
      .setLabel('Ready Up')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
}

export function buildConnectEmbed(match: PlutoMatch): EmbedBuilder {
  const connectCmd = `connect ${match.gameServerIp}:${match.gameServerPort}`;
  return new EmbedBuilder()
    .setTitle('Both Players Ready — Connect Now')
    .setColor(0x22c55e)
    .setDescription(
      `<@${match.player1.discordId}> vs <@${match.player2.discordId}>\n\n` +
      `**Paste this in your console:**\n\`\`\`\n${connectCmd}\n\`\`\``,
    )
    .setFooter({ text: '1v1 Leaderboards' })
    .setTimestamp();
}

export function buildReadyCancelledEmbed(match: PlutoMatch): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Match Cancelled')
    .setColor(0x6b7280)
    .setDescription(
      `Neither player readied up in time.\n\n` +
      `**${match.player1.username}:** ⏳ Not Ready\n` +
      `**${match.player2.username}:** ⏳ Not Ready`,
    );
}

export function buildReadyForfeitEmbed(match: PlutoMatch, winnerId: string): EmbedBuilder {
  const winner = winnerId === match.player1.discordId ? match.player1 : match.player2;
  const noShow = winnerId === match.player1.discordId ? match.player2 : match.player1;
  return new EmbedBuilder()
    .setTitle('Match Forfeited — No-show')
    .setColor(0x22c55e)
    .setDescription(
      `**${noShow.username}** failed to ready up in time.\n\n` +
      `🏆 **${winner.username}** wins by forfeit.`,
    );
}
