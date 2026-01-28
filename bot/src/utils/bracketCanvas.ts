import type { Canvas, CanvasRenderingContext2D } from 'canvas';

interface Match {
  id: string;
  round: number;
  position: number;
  player1?: { id: string; username: string };
  player2?: { id: string; username: string };
  winner?: { id: string; username: string };
  player1Score?: number;
  player2Score?: number;
  status: string;
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

const COLORS = {
  background: '#2f3136',
  cardBg: '#36393f',
  cardBorder: '#202225',
  text: '#ffffff',
  textMuted: '#b9bbbe',
  textDim: '#72767d',
  winner: '#57f287',
  loser: '#ed4245',
  pending: '#5865f2',
  line: '#4f545c',
};

const PLATFORM_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  xbox: { bg: '#0e3d0e', border: '#107C10', accent: '#1db91d' },
  ps3: { bg: '#001d4d', border: '#003791', accent: '#0055cc' },
  playstation: { bg: '#001d4d', border: '#003791', accent: '#0055cc' },
  plutonium: { bg: '#3d0a0a', border: '#BF2120', accent: '#e63333' },
};

const GAME_BACKGROUNDS: Record<string, { primary: string; secondary: string }> = {
  bo2: { primary: '#1a1a1a', secondary: '#2d2d2d' },
  mw3: { primary: '#1c2520', secondary: '#2a3530' },
  mw2: { primary: '#1a1c20', secondary: '#282c32' },
};

export async function generateBracketImage(options: BracketOptions): Promise<Buffer> {
  const { createCanvas } = await import('canvas');
  const { name, matches, bracketType, game = 'bo2', platform = 'xbox', status = 'pending', registeredPlayers = 0, maxPlayers = 8 } = options;

  // Group matches by round
  const rounds: Map<number, Match[]> = new Map();
  matches.forEach(match => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, []);
    }
    rounds.get(match.round)!.push(match);
  });

  // Sort matches within each round by position
  rounds.forEach(roundMatches => {
    roundMatches.sort((a, b) => a.position - b.position);
  });

  const numRounds = rounds.size || 1;
  const maxMatchesInRound = Math.max(...Array.from(rounds.values()).map(r => r.length), 1);

  // Dimensions
  const matchWidth = 160;
  const matchHeight = 50;
  const matchGapY = 20;
  const roundGapX = 80;
  const padding = 40;
  const titleHeight = 50;

  const width = padding * 2 + numRounds * matchWidth + (numRounds - 1) * roundGapX;
  const height = padding * 2 + titleHeight + maxMatchesInRound * (matchHeight + matchGapY);

  const canvas = createCanvas(Math.max(width, 400), Math.max(height, 200));
  const ctx = canvas.getContext('2d');

  // Game-themed background with gradient
  const gameBg = GAME_BACKGROUNDS[game] || GAME_BACKGROUNDS.bo2;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, gameBg.primary);
  gradient.addColorStop(1, gameBg.secondary);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle grid pattern overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px DejaVu Sans, sans-serif';
  ctx.fillText(name, padding, padding + 20);

  // No matches - show registration info for pending tournaments
  if (matches.length === 0) {
    const platformColor = PLATFORM_COLORS[platform] || PLATFORM_COLORS.xbox;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 20;

    if (status === 'pending') {
      // Format bracket type nicely
      const formatLabel = bracketType === 'SINGLE_ELIMINATION' ? 'Single Elimination' :
                          bracketType === 'DOUBLE_ELIMINATION' ? 'Double Elimination' :
                          bracketType === 'ROUND_ROBIN' ? 'Round Robin' :
                          bracketType || 'Tournament';

      // Registration count - large and prominent
      ctx.fillStyle = platformColor.accent;
      ctx.font = 'bold 48px DejaVu Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${registeredPlayers}/${maxPlayers}`, centerX, centerY);

      // "Players Registered" label
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '16px DejaVu Sans, sans-serif';
      ctx.fillText('Players Registered', centerX, centerY + 30);

      // Format label
      ctx.fillStyle = COLORS.textDim;
      ctx.font = '14px DejaVu Sans, sans-serif';
      ctx.fillText(formatLabel, centerX, centerY + 55);

      ctx.textAlign = 'left';
    } else {
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = '14px DejaVu Sans, sans-serif';
      ctx.fillText('No matches yet', padding, padding + titleHeight + 30);
    }
    return canvas.toBuffer('image/png');
  }

  // Draw rounds
  const sortedRounds = Array.from(rounds.keys()).sort((a, b) => a - b);
  const platformColor = PLATFORM_COLORS[platform] || PLATFORM_COLORS.xbox;

  sortedRounds.forEach((roundNum, roundIndex) => {
    const roundMatches = rounds.get(roundNum)!;
    const x = padding + roundIndex * (matchWidth + roundGapX);
    const isFinalRound = roundIndex === sortedRounds.length - 1;

    // Round label
    ctx.fillStyle = isFinalRound ? platformColor.accent : COLORS.textDim;
    ctx.font = isFinalRound ? 'bold 12px DejaVu Sans, sans-serif' : '12px DejaVu Sans, sans-serif';
    const roundLabel = getRoundLabel(roundNum, numRounds);
    ctx.fillText(roundLabel, x, padding + titleHeight);

    // Calculate vertical spacing for this round
    const totalHeight = canvas.height - padding * 2 - titleHeight - 20;
    const matchSpacing = totalHeight / roundMatches.length;

    roundMatches.forEach((match, matchIndex) => {
      const y = padding + titleHeight + 20 + matchIndex * matchSpacing + (matchSpacing - matchHeight) / 2;

      drawMatch(ctx, match, x, y, matchWidth, matchHeight, isFinalRound ? platformColor : undefined);

      // Draw connector lines to next round
      if (roundIndex < sortedRounds.length - 1) {
        const nextRoundMatches = rounds.get(sortedRounds[roundIndex + 1])!;
        const nextMatchIndex = Math.floor(matchIndex / 2);

        if (nextMatchIndex < nextRoundMatches.length) {
          const nextMatchSpacing = totalHeight / nextRoundMatches.length;
          const nextY = padding + titleHeight + 20 + nextMatchIndex * nextMatchSpacing + (nextMatchSpacing - matchHeight) / 2;
          const nextX = padding + (roundIndex + 1) * (matchWidth + roundGapX);

          ctx.strokeStyle = COLORS.line;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + matchWidth, y + matchHeight / 2);
          ctx.lineTo(x + matchWidth + roundGapX / 2, y + matchHeight / 2);
          ctx.lineTo(x + matchWidth + roundGapX / 2, nextY + matchHeight / 2);
          ctx.lineTo(nextX, nextY + matchHeight / 2);
          ctx.stroke();
        }
      }
    });
  });

  return canvas.toBuffer('image/png');
}

function drawMatch(
  ctx: CanvasRenderingContext2D,
  match: Match,
  x: number,
  y: number,
  width: number,
  height: number,
  platformColor?: { bg: string; border: string; accent: string }
) {
  const halfHeight = height / 2;

  // Card background - use platform colors for finals
  if (platformColor) {
    ctx.fillStyle = platformColor.bg;
    ctx.strokeStyle = platformColor.border;
    ctx.lineWidth = 2;
  } else {
    ctx.fillStyle = COLORS.cardBg;
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 1;
  }
  roundRect(ctx, x, y, width, height, 4);
  ctx.fill();
  ctx.stroke();

  // Divider line
  ctx.strokeStyle = platformColor ? platformColor.border : COLORS.cardBorder;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y + halfHeight);
  ctx.lineTo(x + width, y + halfHeight);
  ctx.stroke();

  // Player 1
  const p1Name = match.player1?.username || 'TBD';
  const p1IsWinner = match.winner?.id === match.player1?.id;
  const p1Color = match.winner ? (p1IsWinner ? COLORS.winner : COLORS.textDim) : COLORS.text;

  ctx.fillStyle = p1Color;
  ctx.font = p1IsWinner ? 'bold 12px DejaVu Sans, sans-serif' : '12px DejaVu Sans, sans-serif';
  ctx.fillText(truncate(p1Name, 14), x + 8, y + halfHeight - 8);

  // Player 1 score
  if (match.player1Score !== undefined) {
    ctx.fillStyle = p1Color;
    ctx.font = 'bold 12px DejaVu Sans, sans-serif';
    ctx.fillText(String(match.player1Score), x + width - 20, y + halfHeight - 8);
  }

  // Player 2
  const p2Name = match.player2?.username || 'TBD';
  const p2IsWinner = match.winner?.id === match.player2?.id;
  const p2Color = match.winner ? (p2IsWinner ? COLORS.winner : COLORS.textDim) : COLORS.text;

  ctx.fillStyle = p2Color;
  ctx.font = p2IsWinner ? 'bold 12px DejaVu Sans, sans-serif' : '12px DejaVu Sans, sans-serif';
  ctx.fillText(truncate(p2Name, 14), x + 8, y + height - 8);

  // Player 2 score
  if (match.player2Score !== undefined) {
    ctx.fillStyle = p2Color;
    ctx.font = 'bold 12px DejaVu Sans, sans-serif';
    ctx.fillText(String(match.player2Score), x + width - 20, y + height - 8);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
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
  const fromFinal = totalRounds - round;

  if (fromFinal === 0) return 'Finals';
  if (fromFinal === 1) return 'Semifinals';
  if (fromFinal === 2) return 'Quarterfinals';

  return `Round ${round}`;
}
