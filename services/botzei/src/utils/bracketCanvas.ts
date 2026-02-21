import type { CanvasRenderingContext2D } from 'canvas';
import path from 'path';

function getLogoPath(): string {
  return path.resolve(__dirname, '../assets', 'logo.png');
}

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  player1?: { id: string; username: string } | null;
  player2?: { id: string; username: string } | null;
  winner?: { id: string; username: string } | null;
  player1Score?: number;
  player2Score?: number;
  status: string;
  isBye?: boolean;
}

interface BracketOptions {
  name: string;
  matches: Match[];
  bracketType: string;
  game?: string;
  platform?: string;
  status?: string;
  registeredPlayers?: number;
  maxPlayers?: number;
}

// On-brand color palette — black & blue
const COLORS = {
  bgDark: '#08090c',
  bgCard: '#0d1117',
  bgCardHover: '#131a24',
  border: '#1c2333',
  borderActive: '#22d3ee',
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  textDim: '#475569',
  accent: '#22d3ee',
  accentDim: '#0e7490',
  winner: '#22d3ee',
  loser: '#475569',
  line: '#1e293b',
  lineActive: 'rgba(34, 211, 238, 0.25)',
  finals: '#7c3aed',
  finalsBorder: '#a78bfa',
};

export async function generateBracketImage(options: BracketOptions): Promise<Buffer> {
  const { createCanvas, loadImage } = await import('canvas');
  const { name, matches, bracketType, status = 'pending', registeredPlayers = 0, maxPlayers = 8 } = options;

  // Group matches by round
  const rounds: Map<number, Match[]> = new Map();
  matches.forEach(match => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, []);
    }
    rounds.get(match.round)!.push(match);
  });

  // Sort matches within each round by matchNumber
  rounds.forEach(roundMatches => {
    roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);
  });

  const numRounds = rounds.size || 1;
  const maxMatchesInRound = Math.max(...Array.from(rounds.values()).map(r => r.length), 1);

  // Bigger dimensions
  const matchWidth = 220;
  const matchHeight = 64;
  const matchGapY = 16;
  const roundGapX = 100;
  const padding = 50;
  const headerHeight = 80;

  const contentWidth = numRounds * matchWidth + (numRounds - 1) * roundGapX;
  const contentHeight = maxMatchesInRound * (matchHeight + matchGapY) - matchGapY;
  const width = Math.max(padding * 2 + contentWidth, 500);
  const height = Math.max(padding * 2 + headerHeight + contentHeight + 20, 260);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // === Background ===
  // Dark base
  ctx.fillStyle = COLORS.bgDark;
  ctx.fillRect(0, 0, width, height);

  // Subtle radial glow top-center
  const glow = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, width * 0.7);
  glow.addColorStop(0, 'rgba(34, 211, 238, 0.06)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // Subtle noise grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 1;
  for (let i = 0; i < width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, height);
    ctx.stroke();
  }
  for (let i = 0; i < height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // === Header ===
  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 26px DejaVu Sans, sans-serif';
  ctx.fillText(name, padding, padding + 28);

  // Accent underline
  const titleWidth = ctx.measureText(name).width;
  const underGrad = ctx.createLinearGradient(padding, 0, padding + titleWidth, 0);
  underGrad.addColorStop(0, COLORS.accent);
  underGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = underGrad;
  ctx.fillRect(padding, padding + 36, titleWidth, 2);

  // Logo — top right, dark contrast
  try {
    const logo = await loadImage(getLogoPath());
    const logoH = 36;
    const logoW = (logo.width / logo.height) * logoH;
    const logoX = width - padding - logoW;
    const logoY = padding + 2;

    ctx.globalAlpha = 0.35;
    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    ctx.globalAlpha = 1;
  } catch {
    // Logo not found — skip
  }

  // === No matches — registration state ===
  if (matches.length === 0) {
    const centerX = width / 2;
    const centerY = height / 2 + 30;

    if (status === 'pending') {
      const formatLabel = bracketType === 'SINGLE_ELIMINATION' ? 'Single Elimination' :
                          bracketType === 'DOUBLE_ELIMINATION' ? 'Double Elimination' :
                          bracketType === 'ROUND_ROBIN' ? 'Round Robin' :
                          bracketType || 'Tournament';

      ctx.fillStyle = COLORS.accent;
      ctx.font = 'bold 56px DejaVu Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${registeredPlayers}/${maxPlayers}`, centerX, centerY);

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '18px DejaVu Sans, sans-serif';
      ctx.fillText('Players Registered', centerX, centerY + 35);

      ctx.fillStyle = COLORS.textDim;
      ctx.font = '15px DejaVu Sans, sans-serif';
      ctx.fillText(formatLabel, centerX, centerY + 60);
      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '16px DejaVu Sans, sans-serif';
      ctx.fillText('No matches yet', padding, padding + headerHeight + 30);
    }
    return canvas.toBuffer('image/png');
  }

  // === Draw bracket ===
  const sortedRounds = Array.from(rounds.keys()).sort((a, b) => b - a);
  const bracketTop = padding + headerHeight;
  const bracketHeight = contentHeight;

  sortedRounds.forEach((roundNum, roundIndex) => {
    const roundMatches = rounds.get(roundNum)!;
    const x = padding + roundIndex * (matchWidth + roundGapX);
    const isFinalRound = roundIndex === sortedRounds.length - 1;

    // Round label
    ctx.fillStyle = isFinalRound ? COLORS.accent : COLORS.textDim;
    ctx.font = isFinalRound ? 'bold 13px DejaVu Sans, sans-serif' : '13px DejaVu Sans, sans-serif';
    const roundLabel = getRoundLabel(roundNum, numRounds);
    const labelMetrics = ctx.measureText(roundLabel);
    ctx.fillText(roundLabel, x + (matchWidth - labelMetrics.width) / 2, bracketTop - 8);

    // Calculate vertical spacing for this round
    const matchSpacing = roundMatches.length === 1 ? bracketHeight : bracketHeight / roundMatches.length;

    roundMatches.forEach((match, matchIndex) => {
      const y = bracketTop + matchIndex * matchSpacing + (matchSpacing - matchHeight) / 2;

      drawMatch(ctx, match, x, y, matchWidth, matchHeight, isFinalRound);

      // Connector lines to next round
      if (roundIndex < sortedRounds.length - 1) {
        const nextRoundMatches = rounds.get(sortedRounds[roundIndex + 1])!;
        const nextMatchIndex = Math.floor(matchIndex / 2);

        if (nextMatchIndex < nextRoundMatches.length) {
          const nextMatchSpacing = nextRoundMatches.length === 1 ? bracketHeight : bracketHeight / nextRoundMatches.length;
          const nextY = bracketTop + nextMatchIndex * nextMatchSpacing + (nextMatchSpacing - matchHeight) / 2;
          const nextX = padding + (roundIndex + 1) * (matchWidth + roundGapX);

          const midX = x + matchWidth + roundGapX / 2;
          const fromY = y + matchHeight / 2;
          const toY = nextY + matchHeight / 2;

          // Use brighter line if match is completed
          ctx.strokeStyle = match.status === 'COMPLETED' && !match.isBye ? COLORS.lineActive : COLORS.line;
          ctx.lineWidth = 2;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(x + matchWidth, fromY);
          ctx.lineTo(midX, fromY);
          ctx.lineTo(midX, toY);
          ctx.lineTo(nextX, toY);
          ctx.stroke();
        }
      }
    });
  });

  // === Bottom accent bar ===
  const barGrad = ctx.createLinearGradient(0, 0, width, 0);
  barGrad.addColorStop(0, COLORS.accent);
  barGrad.addColorStop(0.5, COLORS.accentDim);
  barGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = barGrad;
  ctx.fillRect(0, height - 3, width, 3);

  return canvas.toBuffer('image/png');
}

function drawMatch(
  ctx: CanvasRenderingContext2D,
  match: Match,
  x: number,
  y: number,
  width: number,
  height: number,
  isFinalRound: boolean,
) {
  const halfHeight = height / 2;
  const radius = 8;

  // Bye match styling
  if (match.isBye) {
    ctx.globalAlpha = 0.4;
    ctx.setLineDash([5, 5]);
  }

  // Card background
  if (isFinalRound) {
    ctx.fillStyle = '#130f1e';
    ctx.strokeStyle = match.status === 'COMPLETED' ? COLORS.finalsBorder : COLORS.finals;
    ctx.lineWidth = 2;
  } else if (match.status === 'READY') {
    ctx.fillStyle = COLORS.bgCardHover;
    ctx.strokeStyle = COLORS.borderActive;
    ctx.lineWidth = 2;
  } else {
    ctx.fillStyle = COLORS.bgCard;
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
  }

  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();

  // Reset line dash
  ctx.setLineDash([]);

  // Divider line
  ctx.strokeStyle = isFinalRound ? 'rgba(124, 58, 237, 0.3)' : COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + halfHeight);
  ctx.lineTo(x + width - 10, y + halfHeight);
  ctx.stroke();

  // "LIVE" indicator for READY matches
  if (match.status === 'READY' && !match.isBye) {
    ctx.fillStyle = COLORS.accent;
    ctx.font = 'bold 9px DejaVu Sans, sans-serif';
    ctx.fillText('● LIVE', x + width - 52, y + 13);
  }

  // Player 1
  const p1Name = match.isBye && !match.player1 ? 'BYE' : (match.player1?.username || 'TBD');
  const p1IsWinner = !match.isBye && match.winner?.id === match.player1?.id;
  const p1IsLoser = !match.isBye && match.status === 'COMPLETED' && match.player1 && !p1IsWinner;
  const p1Color = match.isBye
    ? COLORS.textDim
    : p1IsWinner ? COLORS.winner : p1IsLoser ? COLORS.loser : COLORS.text;

  ctx.fillStyle = p1Color;
  ctx.font = p1IsWinner ? 'bold 14px DejaVu Sans, sans-serif' : '14px DejaVu Sans, sans-serif';
  ctx.fillText(truncate(p1Name, 18), x + 12, y + halfHeight - 10);

  if (match.player1Score !== undefined) {
    ctx.fillStyle = p1Color;
    ctx.font = 'bold 14px DejaVu Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(match.player1Score), x + width - 12, y + halfHeight - 10);
    ctx.textAlign = 'left';
  }

  // Player 2
  const p2Name = match.isBye && !match.player2 ? 'BYE' : (match.player2?.username || 'TBD');
  const p2IsWinner = !match.isBye && match.winner?.id === match.player2?.id;
  const p2IsLoser = !match.isBye && match.status === 'COMPLETED' && match.player2 && !p2IsWinner;
  const p2Color = match.isBye
    ? COLORS.textDim
    : p2IsWinner ? COLORS.winner : p2IsLoser ? COLORS.loser : COLORS.text;

  ctx.fillStyle = p2Color;
  ctx.font = p2IsWinner ? 'bold 14px DejaVu Sans, sans-serif' : '14px DejaVu Sans, sans-serif';
  ctx.fillText(truncate(p2Name, 18), x + 12, y + height - 10);

  if (match.player2Score !== undefined) {
    ctx.fillStyle = p2Color;
    ctx.font = 'bold 14px DejaVu Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(match.player2Score), x + width - 12, y + height - 10);
    ctx.textAlign = 'left';
  }

  // Winner trophy indicator
  if (!match.isBye && match.status === 'COMPLETED') {
    const trophyY = p1IsWinner ? y + halfHeight - 14 : y + height - 14;
    ctx.fillStyle = COLORS.accent;
    ctx.font = '11px DejaVu Sans, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('▸ W', x + width - 12, trophyY);
    ctx.textAlign = 'left';
  }

  // Reset after bye
  if (match.isBye) {
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}

function getRoundLabel(round: number, totalRounds: number): string {
  if (round === 1) return 'FINALS';
  if (round === 2) return 'SEMIFINALS';
  if (round === 3) return 'QUARTERFINALS';
  return `ROUND ${totalRounds - round + 1}`;
}
