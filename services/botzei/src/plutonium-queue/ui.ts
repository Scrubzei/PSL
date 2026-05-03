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
import { PlutoGameServer, PlutoQueue } from './types.js';

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

  embed.setFooter({ text: 'Click Join Queue to play' });

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

export function buildReadyUpEmbed(server: PlutoGameServer): EmbedBuilder {
  const expiresEpoch = Math.floor((server.readyUpExpiresAt ?? 0) / 1000);
  const p1Status = server.player1?.ready ? '✅ Ready' : '⏳ Waiting';
  const p2Status = server.player2?.ready ? '✅ Ready' : '⏳ Waiting';

  return new EmbedBuilder()
    .setTitle(`Match Found — ${server.title}`)
    .setColor(platformColor(server.platform ?? ''))
    .setDescription(
      `<@${server.player1?.discordId}>  **vs**  <@${server.player2?.discordId}>\n\n` +
      `Both players must ready up before the timer runs out.`,
    )
    .addFields(
      { name: server.player1?.username ?? 'Player 1', value: p1Status, inline: true },
      { name: server.player2?.username ?? 'Player 2', value: p2Status, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Game', value: server.game ?? '?', inline: true },
      { name: 'Platform', value: server.platform ?? '?', inline: true },
      { name: 'Expires', value: `<t:${expiresEpoch}:R>`, inline: true },
    );
}

export function buildReadyUpRow(server: PlutoGameServer): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`pq:ready:${server.id}`)
      .setLabel('Ready Up')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
}

export function buildConnectEmbed(server: PlutoGameServer): EmbedBuilder {
  const connectCmd = `connect ${server.ip}:${server.port}`;
  return new EmbedBuilder()
    .setTitle('Both Players Ready — Connect Now')
    .setColor(0x22c55e)
    .setDescription(
      `<@${server.player1?.discordId}> vs <@${server.player2?.discordId}>\n\n` +
      `**Paste this in your console:**\n\`\`\`\n${connectCmd}\n\`\`\``,
    )
    .setFooter({ text: '1v1 Leaderboards' })
    .setTimestamp();
}

export function buildReadyCancelledEmbed(server: PlutoGameServer): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Match Cancelled')
    .setColor(0x6b7280)
    .setDescription(
      `Neither player readied up in time.\n\n` +
      `**${server.player1?.username ?? 'Player 1'}:** ⏳ Not Ready\n` +
      `**${server.player2?.username ?? 'Player 2'}:** ⏳ Not Ready`,
    );
}

export function buildReadyForfeitEmbed(server: PlutoGameServer, winnerId: string): EmbedBuilder {
  const winner = winnerId === server.player1?.discordId ? server.player1 : server.player2;
  const noShow = winnerId === server.player1?.discordId ? server.player2 : server.player1;
  return new EmbedBuilder()
    .setTitle('Match Forfeited — No-show')
    .setColor(0x22c55e)
    .setDescription(
      `**${noShow?.username ?? '?'}** failed to ready up in time.\n\n` +
      `🏆 **${winner?.username ?? '?'}** wins by forfeit.`,
    );
}
