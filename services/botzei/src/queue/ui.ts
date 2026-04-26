/**
 * Embed and component builders for the queue system.
 *
 * Pure functions — read from domain objects, return Discord.js builders.
 * No state mutation, no side effects.
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
import { Match, Queue, QueueState } from './types.js';
import { loadState } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PLATFORM_COLORS: Record<string, number> = {
  xbox: 0x107c10,
  ps3: 0x003791,
  playstation: 0x003791,
  plutonium: 0xbf2120,
  iw4x: 0x7c3aed,
};

const DEFAULT_COLOR = 0x2563eb;
const WINNER_COLOR = 0x22c55e;
const DISPUTE_COLOR = 0xef4444;
const CANCEL_COLOR = 0x6b7280;

function platformColor(platform: string): number {
  return PLATFORM_COLORS[platform.toLowerCase()] ?? DEFAULT_COLOR;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMatchesToday(state: QueueState): number {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const dayStart = startOfDay.getTime();
  return state.matches.filter(
    (m) => m.state === 'completed' && m.completedAt && m.completedAt >= dayStart,
  ).length;
}

function getLastMatch(state: QueueState, queueId: string): Match | undefined {
  return state.matches
    .filter((m) => m.queueId === queueId && m.state === 'completed' && m.winnerId)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
}

function getWinStreak(state: QueueState, discordId: string): number {
  const playerMatches = state.matches
    .filter(
      (m) =>
        m.state === 'completed' &&
        m.winnerId &&
        (m.player1.discordId === discordId || m.player2.discordId === discordId),
    )
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  let streak = 0;
  for (const m of playerMatches) {
    if (m.winnerId === discordId) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

const GAME_BANNERS: Record<string, string> = {
  mw2: 'mw2-banner.png',
  bo2: 'bo2-banner.png',
  mw2019: 'mw2019-banner.jpg',
  'mw 2019': 'mw2019-banner.jpg',
};

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

export function buildQueueEmbed(queue: Queue): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const state = loadState();
  const matchesToday = getMatchesToday(state);
  const lastMatch = getLastMatch(state, queue.id);

  const queueStatus =
    queue.players.length === 0
      ? '_No one in queue. Be the first!_'
      : queue.players.length === 1
        ? '_Searching for opponent..._'
        : `_${queue.players.length} players in queue_`;

  const lines: string[] = [];
  if (lastMatch) {
    const winner = lastMatch.winnerId === lastMatch.player1.discordId
      ? lastMatch.player1 : lastMatch.player2;
    const loser = lastMatch.winnerId === lastMatch.player1.discordId
      ? lastMatch.player2 : lastMatch.player1;
    const ago = Math.floor((Date.now() - (lastMatch.completedAt ?? 0)) / 60000);
    const agoText = ago < 1 ? 'just now' : ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
    lines.push(`Last match: **${winner.username}** beat **${loser.username}** (${agoText})`);
  }

  const embed = new EmbedBuilder()
    .setTitle(queue.title)
    .setColor(platformColor(queue.platform))
    .setImage('attachment://banner.png')
    .addFields(
      { name: 'Game', value: queue.game, inline: true },
      { name: 'Platform', value: queue.platform, inline: true },
      {
        name: 'Queue',
        value: `**${queue.players.length}** / 2`,
        inline: true,
      },
      {
        name: 'Map Pool',
        value: queue.maps.join('  ·  '),
      },
      { name: 'Status', value: queueStatus },
    );

  if (lines.length > 0) {
    embed.setDescription(lines.join('\n'));
  }

  const footerParts = ['Click Join Queue to play'];
  if (matchesToday > 0) {
    footerParts.push(`${matchesToday} match${matchesToday === 1 ? '' : 'es'} played today`);
  }
  embed.setFooter({ text: footerParts.join('  ·  ') });

  return { embed, files: [getBannerAttachment(queue.game)] };
}

export function buildQueueButtons(queue: Queue): ActionRowBuilder<ButtonBuilder>[] {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const gameSlug = encodeURIComponent(queue.game.toLowerCase());
  const platformSlug = encodeURIComponent(queue.platform.toLowerCase());
  const leaderboardUrl = `${frontendUrl}/leaderboards/${gameSlug}/${platformSlug}?tab=elo`;

  const mainRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue:join:${queue.id}`)
      .setLabel('Join Queue')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`queue:leave:${queue.id}`)
      .setLabel('Leave Queue')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setLabel('Stats')
      .setStyle(ButtonStyle.Link)
      .setURL(leaderboardUrl)
      .setEmoji('📊'),
  );

  return [mainRow];
}

// ---------------------------------------------------------------------------
// Ready-up phase
// ---------------------------------------------------------------------------

export function buildReadyUpEmbed(match: Match): EmbedBuilder {
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
      {
        name: 'Expires',
        value: `<t:${expiresEpoch}:R>`,
        inline: true,
      },
    );
}

export function buildReadyUpRow(
  match: Match,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`match:ready:${match.id}`)
      .setLabel('Ready Up')
      .setStyle(ButtonStyle.Success)
      .setEmoji('✅'),
  );
}

export function buildReadyCancelledEmbed(match: Match): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Match Cancelled')
    .setColor(CANCEL_COLOR)
    .setDescription(
      `Neither player readied up in time. The match has been cancelled.\n\n` +
        `**${match.player1.username}:** ⏳ Not Ready\n` +
        `**${match.player2.username}:** ⏳ Not Ready`,
    );
}

export function buildReadyForfeitEmbed(match: Match): EmbedBuilder {
  const winner =
    match.winnerId === match.player1.discordId
      ? match.player1
      : match.player2;
  const noShow =
    match.winnerId === match.player1.discordId
      ? match.player2
      : match.player1;

  return new EmbedBuilder()
    .setTitle('Match Forfeited — No-show')
    .setColor(WINNER_COLOR)
    .setDescription(
      `**${noShow.username}** failed to ready up in time.\n\n` +
        `🏆 **${winner.username}** wins by forfeit.`,
    );
}

// ---------------------------------------------------------------------------
// Map selection
// ---------------------------------------------------------------------------

export function buildMapSelectionEmbed(match: Match): EmbedBuilder {
  const expiresEpoch = Math.floor((match.mapSelectionExpiresAt ?? 0) / 1000);

  const p1Pick = match.player1.mapSelection
    ? `**${match.player1.mapSelection}**`
    : '⏳ Waiting';
  const p2Pick = match.player2.mapSelection
    ? `**${match.player2.mapSelection}**`
    : '⏳ Waiting';

  return new EmbedBuilder()
    .setTitle(`Map Selection — ${match.title}`)
    .setColor(platformColor(match.platform))
    .setDescription(
      `<@${match.player1.discordId}>  **vs**  <@${match.player2.discordId}>\n\n` +
        `Both players: pick a map below.\n` +
        `• Same map → that's your map.\n` +
        `• Different maps → coin flip between them.`,
    )
    .addFields(
      { name: match.player1.username, value: p1Pick, inline: true },
      { name: match.player2.username, value: p2Pick, inline: true },
      { name: '\u200b', value: '\u200b', inline: true },
      { name: 'Game', value: match.game, inline: true },
      { name: 'Platform', value: match.platform, inline: true },
      {
        name: 'Expires',
        value: `<t:${expiresEpoch}:R>`,
        inline: true,
      },
    );
}

export function buildMapSelectionRows(
  match: Match,
): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < match.maps.length && rows.length < 5; i += 5) {
    const chunk = match.maps.slice(i, i + 5);
    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...chunk.map((map) =>
          new ButtonBuilder()
            .setCustomId(`match:map:${match.id}:${map}`)
            .setLabel(map)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }
  return rows;
}

export function buildMapCancelledEmbed(match: Match): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Match Cancelled')
    .setColor(CANCEL_COLOR)
    .setDescription(
      `Neither player picked a map in time. The match has been cancelled.\n\n` +
        `**${match.player1.username}:** ⏳ No pick\n` +
        `**${match.player2.username}:** ⏳ No pick`,
    );
}

export function buildMapForfeitEmbed(match: Match): EmbedBuilder {
  const winner =
    match.winnerId === match.player1.discordId
      ? match.player1
      : match.player2;
  const noShow =
    match.winnerId === match.player1.discordId
      ? match.player2
      : match.player1;

  return new EmbedBuilder()
    .setTitle('Match Forfeited — No Map Pick')
    .setColor(WINNER_COLOR)
    .setDescription(
      `**${noShow.username}** failed to pick a map in time.\n\n` +
        `🏆 **${winner.username}** wins by forfeit.`,
    );
}

// ---------------------------------------------------------------------------
// Map decided (transition to reporting)
// ---------------------------------------------------------------------------

export function buildMapDecidedEmbed(
  match: Match,
  randomized: boolean,
): EmbedBuilder {
  const p1 = match.player1;
  const p2 = match.player2;
  const lines = [
    `**${p1.username}** picked **${p1.mapSelection}**`,
    `**${p2.username}** picked **${p2.mapSelection}**`,
    '',
    randomized
      ? `🎲 Coin flip result: **${match.finalMap}**`
      : `✅ Agreed on **${match.finalMap}**`,
    '',
    'Play your match, then report the result below.',
  ];

  return new EmbedBuilder()
    .setTitle(`Map: ${match.finalMap}`)
    .setColor(platformColor(match.platform))
    .setDescription(lines.join('\n'))
    .addFields(
      { name: 'Player 1', value: `<@${p1.discordId}>`, inline: true },
      { name: 'Player 2', value: `<@${p2.discordId}>`, inline: true },
    );
}

export function buildReportingRow(
  match: Match,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`match:result:${match.id}:won`)
      .setLabel('I Won')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🏆'),
    new ButtonBuilder()
      .setCustomId(`match:result:${match.id}:lost`)
      .setLabel('I Lost')
      .setStyle(ButtonStyle.Danger),
  );
}

// ---------------------------------------------------------------------------
// Resolved / disputed
// ---------------------------------------------------------------------------

export function buildCompletedEmbed(
  match: Match,
  eloChanges?: { winner: { change: number | null }; loser: { change: number | null } } | null,
): EmbedBuilder {
  const winner =
    match.winnerId === match.player1.discordId ? match.player1 : match.player2;
  const loser =
    match.winnerId === match.player1.discordId ? match.player2 : match.player1;

  const winnerElo = eloChanges?.winner?.change;
  const loserElo = eloChanges?.loser?.change;

  const winnerLine = winnerElo != null
    ? `🏆 **${winner.username}** (+${winnerElo} ELO)`
    : `🏆 **${winner.username}**`;
  const loserLine = loserElo != null
    ? `**${loser.username}** (${loserElo} ELO)`
    : `**${loser.username}**`;

  const state = loadState();
  const streak = getWinStreak(state, match.winnerId!);
  const streakText = streak >= 3 ? `\n\n🔥 **${streak} win streak!**` : '';

  return new EmbedBuilder()
    .setTitle('Match Completed')
    .setColor(WINNER_COLOR)
    .setDescription(
      `${winnerLine} defeated ${loserLine}\n\n` +
        `**Map:** ${match.finalMap}` +
        streakText,
    );
}

export function buildDisputedEmbed(match: Match): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Match Disputed')
    .setColor(DISPUTE_COLOR)
    .setDescription(
      `Both players reported that they won. A ref will review this match.\n\n` +
        `**Players:** <@${match.player1.discordId}> vs <@${match.player2.discordId}>\n` +
        `**Map:** ${match.finalMap}\n\n` +
        `Players can concede below, or a ref can force the result.`,
    );
}

export function buildDisputeButtons(
  match: Match,
): ActionRowBuilder<ButtonBuilder>[] {
  const concedeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`match:concede:${match.id}:${match.player2.discordId}`)
      .setLabel(`Give win to ${match.player2.username}`)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`match:concede:${match.id}:${match.player1.discordId}`)
      .setLabel(`Give win to ${match.player1.username}`)
      .setStyle(ButtonStyle.Danger),
  );

  const refRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`match:ref:${match.id}:${match.player1.discordId}`)
      .setLabel(`[REF] ${match.player1.username} wins`)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`match:ref:${match.id}:${match.player2.discordId}`)
      .setLabel(`[REF] ${match.player2.username} wins`)
      .setStyle(ButtonStyle.Secondary),
  );

  return [concedeRow, refRow];
}
