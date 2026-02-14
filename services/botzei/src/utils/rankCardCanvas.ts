import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from 'canvas';
import path from 'path';

// Register Font Awesome for icons
try {
  registerFont(path.join(__dirname, '../assets/fontawesome.ttf'), { family: 'Font Awesome' });
} catch (e) {
  // Font may already be registered
}

interface LeaderboardRanking {
  game: string;
  platform: string;
  rank: number;
  totalPlayers: number;
  wins: number;
  losses: number;
}

interface RankCardData {
  username: string;
  oddsRatio?: number | null;
  avatar?: string;
  level: number;
  totalXp: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  leaderboardRankings: LeaderboardRanking[];
}

const COLORS = {
  background: '#0f1419',
  cardBg: '#1a1f26',
  accent: '#22d3ee',
  accentDark: '#06b6d4',
  text: '#ffffff',
  textMuted: '#9ca3af',
  textDim: '#6b7280',
  win: '#22c55e',
  loss: '#ef4444',
  gold: '#fbbf24',
  silver: '#94a3b8',
  bronze: '#cd7c32',
};

export async function generateRankCard(data: RankCardData): Promise<Buffer> {
  const width = 600;
  const headerHeight = 140;
  const statsHeight = 70;
  const rankingRowHeight = 36;
  const rankingsCount = Math.min(data.leaderboardRankings.length, 5);
  const rankingsHeight = rankingsCount > 0 ? 40 + (rankingsCount * rankingRowHeight) : 0;
  const padding = 24;
  const height = headerHeight + statsHeight + rankingsHeight + padding;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  // Header card
  ctx.fillStyle = COLORS.cardBg;
  roundRect(ctx, 16, 16, width - 32, headerHeight - 20, 16);
  ctx.fill();

  // Avatar
  const avatarSize = 80;
  const avatarX = 36;
  const avatarY = 30;

  ctx.save();
  roundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 16);
  ctx.clip();

  if (data.avatar) {
    try {
      const img = await loadImage(data.avatar);
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      // Fallback to initial
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
      ctx.fillStyle = COLORS.background;
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(data.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }
  } else {
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
    ctx.fillStyle = COLORS.background;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.username.charAt(0).toUpperCase(), avatarX + avatarSize / 2, avatarY + avatarSize / 2);
  }
  ctx.restore();

  // Level badge on avatar
  const badgeSize = 28;
  const badgeX = avatarX + avatarSize - badgeSize + 6;
  const badgeY = avatarY + avatarSize - badgeSize + 6;
  ctx.fillStyle = COLORS.accent;
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.background;
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(data.level), badgeX + badgeSize / 2, badgeY + badgeSize / 2);

  // Username
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(data.username, avatarX + avatarSize + 20, avatarY + 8);

  // Level text
  ctx.fillStyle = COLORS.accent;
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`Level ${data.level}`, avatarX + avatarSize + 20, avatarY + 40);

  // XP text
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '12px sans-serif';
  ctx.fillText(`${data.totalXp.toLocaleString()} XP`, avatarX + avatarSize + 100, avatarY + 42);

  // XP bar
  const xpBarX = avatarX + avatarSize + 20;
  const xpBarY = avatarY + 62;
  const xpBarWidth = 200;
  const xpBarHeight = 8;

  // Calculate XP progress
  const xpForCurrentLevel = Math.pow(data.level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(data.level, 2) * 100;
  const xpProgress = Math.min(1, (data.totalXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel));

  ctx.fillStyle = '#2d3748';
  roundRect(ctx, xpBarX, xpBarY, xpBarWidth, xpBarHeight, 4);
  ctx.fill();

  if (xpProgress > 0) {
    const gradient = ctx.createLinearGradient(xpBarX, 0, xpBarX + xpBarWidth * xpProgress, 0);
    gradient.addColorStop(0, COLORS.accentDark);
    gradient.addColorStop(1, COLORS.accent);
    ctx.fillStyle = gradient;
    roundRect(ctx, xpBarX, xpBarY, xpBarWidth * xpProgress, xpBarHeight, 4);
    ctx.fill();
  }

  // Stats section
  const statsY = headerHeight;
  ctx.fillStyle = COLORS.cardBg;
  roundRect(ctx, 16, statsY, width - 32, statsHeight - 10, 12);
  ctx.fill();

  // Stats grid
  const statWidth = (width - 32) / 3;
  const statCenterY = statsY + (statsHeight - 10) / 2;

  // Wins
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.win;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(String(data.totalWins), 16 + statWidth * 0.5, statCenterY - 6);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('WINS', 16 + statWidth * 0.5, statCenterY + 16);

  // Losses
  ctx.fillStyle = COLORS.loss;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(String(data.totalLosses), 16 + statWidth * 1.5, statCenterY - 6);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('LOSSES', 16 + statWidth * 1.5, statCenterY + 16);

  // Win Rate
  const winRateColor = data.winRate >= 60 ? COLORS.win : data.winRate >= 40 ? COLORS.text : COLORS.loss;
  ctx.fillStyle = winRateColor;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText(`${data.winRate}%`, 16 + statWidth * 2.5, statCenterY - 6);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px sans-serif';
  ctx.fillText('WIN RATE', 16 + statWidth * 2.5, statCenterY + 16);

  // Rankings section
  if (rankingsCount > 0) {
    const rankingsY = headerHeight + statsHeight;

    ctx.fillStyle = COLORS.cardBg;
    roundRect(ctx, 16, rankingsY, width - 32, rankingsHeight - 10, 12);
    ctx.fill();

    // Rankings header
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '11px sans-serif';
    ctx.fillText('LEADERBOARD RANKINGS', 32, rankingsY + 20);

    // Column headers
    ctx.fillText('RANK', 32, rankingsY + 40);
    ctx.fillText('GAME', 100, rankingsY + 40);
    ctx.fillText('RECORD', width - 130, rankingsY + 40);

    // Rankings rows
    data.leaderboardRankings.slice(0, 5).forEach((ranking, index) => {
      const rowY = rankingsY + 56 + (index * rankingRowHeight);

      // Rank with medal colors
      let rankColor = COLORS.textMuted;
      if (ranking.rank === 1) rankColor = COLORS.gold;
      else if (ranking.rank === 2) rankColor = COLORS.silver;
      else if (ranking.rank === 3) rankColor = COLORS.bronze;

      ctx.fillStyle = rankColor;
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(`#${ranking.rank}`, 32, rowY);

      // Game & Platform
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px sans-serif';
      ctx.fillText(`${ranking.game}`, 100, rowY);
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${ranking.platform}`, 100 + ctx.measureText(ranking.game).width + 8, rowY);

      // Record
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '14px sans-serif';
      ctx.fillText(`${ranking.wins}W ${ranking.losses}L`, width - 130, rowY);
    });
  }

  return canvas.toBuffer('image/png');
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
