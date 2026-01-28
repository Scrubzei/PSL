import { createCanvas, registerFont } from 'canvas';
import path from 'path';

// Register Font Awesome for trophy icons
registerFont(path.join(__dirname, '../assets/fontawesome.ttf'), { family: 'Font Awesome' });

interface LeaderboardEntry {
  username: string;
  wins: number;
  losses: number;
}

interface LeaderboardCanvasOptions {
  title: string;
  entries: LeaderboardEntry[];
  page: number;
  totalPages: number;
  totalPlayers: number;
  accentColor: string;
  startIndex: number;
}

// Discord embed background color (dark theme)
const COLORS = {
  background: '#131416',
  text: '#ffffff',
  textMuted: '#b9bbbe',
  textDim: '#72767d',
};

export function generateLeaderboardImage(options: LeaderboardCanvasOptions): Buffer {
  const { title, entries, page, totalPages, totalPlayers, accentColor, startIndex } = options;

  const rowHeight = 32;
  const headerHeight = 70;
  const footerHeight = 35;
  const width = 500;
  const height = headerHeight + (entries.length * rowHeight) + footerHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background - match Discord embed
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 18px DejaVu Sans, sans-serif';
  ctx.fillText(title, 16, 30);

  // Column headers
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px DejaVu Sans, sans-serif';
  ctx.fillText('RANK', 16, 55);
  ctx.fillText('PLAYER', 70, 55);
  ctx.fillText('W/L', width - 140, 55);
  ctx.fillText('WIN%', width - 60, 55);

  // Entries
  entries.forEach((entry, index) => {
    const globalRank = startIndex + index + 1;
    const y = headerHeight + (index * rowHeight) + 22;
    const total = entry.wins + entry.losses;
    const winPct = total > 0 ? Math.round((entry.wins / total) * 100) : 0;

    // Rank with trophies for top 3
    const isTop3 = globalRank <= 3;

    if (globalRank <= 3) {
      // Font Awesome trophy icon colors
      const trophyColors: Record<number, string> = {
        1: '#ffd700', // Gold
        2: '#c0c0c0', // Silver
        3: '#cd7f32', // Bronze
      };

      ctx.fillStyle = trophyColors[globalRank];
      ctx.font = '16px "Font Awesome"';
      // Font Awesome trophy icon is at unicode \uf091
      ctx.fillText('\uf091', 16, y);
    } else {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '14px DejaVu Sans, sans-serif';
      ctx.fillText(`${globalRank}.`, 20, y);
    }

    // Player name
    ctx.fillStyle = isTop3 ? COLORS.text : COLORS.textMuted;
    ctx.font = isTop3 ? 'bold 14px DejaVu Sans, sans-serif' : '14px DejaVu Sans, sans-serif';
    ctx.fillText(entry.username, 70, y);

    // W/L
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = '14px DejaVu Sans, sans-serif';
    ctx.fillText(`${entry.wins}-${entry.losses}`, width - 140, y);

    // Win %
    if (winPct >= 70) {
      ctx.fillStyle = '#57f287';
    } else if (winPct >= 50) {
      ctx.fillStyle = COLORS.text;
    } else {
      ctx.fillStyle = '#ed4245';
    }
    ctx.font = '14px DejaVu Sans, sans-serif';
    ctx.fillText(`${winPct}%`, width - 60, y);
  });

  // Footer
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px DejaVu Sans, sans-serif';
  ctx.fillText(`Page ${page}/${totalPages} • ${totalPlayers} players`, 16, height - 12);

  return canvas.toBuffer('image/png');
}
