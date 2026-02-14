import type { CanvasRenderingContext2D } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BannerOptions {
  title: string;
  game: string;
  platform: string;
  prizePool?: { place: number; prize: string }[];
  startDate?: string;
}

function getAssetPath(...segments: string[]): string {
  return path.resolve(__dirname, '../assets', ...segments);
}

function getGameImagePath(game: string): string {
  return getAssetPath(`${game.toLowerCase()}.png`);
}

function getLogoPath(): string {
  return getAssetPath('logo.png');
}

const PLATFORM_ACCENTS: Record<string, string> = {
  xbox: '#107C10',
  ps3: '#003791',
  playstation: '#003791',
  plutonium: '#BF2120',
};

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

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}


export async function generateAnnounceBanner(options: BannerOptions): Promise<Buffer> {
  const { createCanvas, loadImage } = await import('canvas');
  const { title, game, platform, prizePool, startDate } = options;

  const dpr = 2;
  const width = 800;
  // Calculate height based on content
  const hasPrizes = prizePool && prizePool.length > 0;
  let height = 280;
  if (hasPrizes) height += 70;

  const canvas = createCanvas(width * dpr, height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const accent = PLATFORM_ACCENTS[platform.toLowerCase()] || PLATFORM_ACCENTS.plutonium;

  // === Solid black base ===
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, width, height);

  // === Game background ===
  try {
    const bgImg = await loadImage(getGameImagePath(game));
    const imgScale = Math.max(width / bgImg.width, height / bgImg.height);
    const imgW = bgImg.width * imgScale;
    const imgH = bgImg.height * imgScale;
    const imgX = (width - imgW) / 2;
    const imgY = (height - imgH) / 2;
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bgImg, imgX, imgY, imgW, imgH);
    ctx.globalAlpha = 1;
  } catch {
    // No game image
  }

  // === Dark overlay ===
  const overlay = ctx.createLinearGradient(0, 0, 0, height);
  overlay.addColorStop(0, 'rgba(0, 0, 0, 0.5)');
  overlay.addColorStop(0.5, 'rgba(0, 0, 0, 0.65)');
  overlay.addColorStop(0.8, 'rgba(10, 10, 10, 0.9)');
  overlay.addColorStop(1, 'rgba(10, 10, 10, 0.98)');
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, width, height);

  // === Subtle accent tint from top-right ===
  const redGrad = ctx.createLinearGradient(width, 0, 0, height);
  redGrad.addColorStop(0, hexToRgba(accent, 0.1));
  redGrad.addColorStop(0.35, hexToRgba(accent, 0.03));
  redGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = redGrad;
  ctx.fillRect(0, 0, width, height);

  // === Soft accent glow behind title ===
  const glow = ctx.createRadialGradient(width / 2, height * 0.25, 0, width / 2, height * 0.25, width * 0.45);
  glow.addColorStop(0, hexToRgba(accent, 0.08));
  glow.addColorStop(0.5, hexToRgba(accent, 0.03));
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  // === Thin accent line at top ===
  const topLine = ctx.createLinearGradient(0, 0, width, 0);
  topLine.addColorStop(0, 'transparent');
  topLine.addColorStop(0.3, accent);
  topLine.addColorStop(0.7, accent);
  topLine.addColorStop(1, 'transparent');
  ctx.fillStyle = topLine;
  ctx.fillRect(0, 0, width, 3);

  const lineGlow = ctx.createLinearGradient(0, 0, 0, 20);
  lineGlow.addColorStop(0, hexToRgba(accent, 0.3));
  lineGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = lineGlow;
  ctx.fillRect(width * 0.2, 0, width * 0.6, 20);

  // === Logo ===
  try {
    const logo = await loadImage(getLogoPath());
    const logoH = 44;
    const logoW = (logo.width / logo.height) * logoH;
    const logoX = (width - logoW) / 2;
    const logoY = 16;

    const logoGlow = ctx.createRadialGradient(
      logoX + logoW / 2, logoY + logoH / 2, 0,
      logoX + logoW / 2, logoY + logoH / 2, logoH,
    );
    logoGlow.addColorStop(0, hexToRgba(accent, 0.2));
    logoGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = logoGlow;
    ctx.fillRect(logoX - logoH, logoY - logoH / 2, logoW + logoH * 2, logoH * 2);

    ctx.drawImage(logo, logoX, logoY, logoW, logoH);
  } catch {
    // No logo
  }

  // === "TOURNAMENT" label with decorative lines ===
  const labelY = 70;
  ctx.fillStyle = hexToRgba(accent, 0.9);
  ctx.font = 'bold 11px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelText = 'T O U R N A M E N T';
  const labelWidth = ctx.measureText(labelText).width;
  ctx.fillText(labelText, width / 2, labelY);

  const lineLen = 60;
  const lineY = labelY + 6;
  const lineGap = 12;
  ctx.strokeStyle = hexToRgba(accent, 0.35);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 2 - labelWidth / 2 - lineGap, lineY);
  ctx.lineTo(width / 2 - labelWidth / 2 - lineGap - lineLen, lineY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(width / 2 + labelWidth / 2 + lineGap, lineY);
  ctx.lineTo(width / 2 + labelWidth / 2 + lineGap + lineLen, lineY);
  ctx.stroke();

  // === Title ===
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const maxTitleWidth = width - 100;
  const titleLines = wrapText(ctx, title, maxTitleWidth);
  let curY = 90;
  for (const line of titleLines) {
    ctx.fillText(line, width / 2, curY);
    curY += 42;
  }

  // === Meta row: game + platform + format ===
  curY += 6;
  const gameName = game.toUpperCase();
  const platformName = platform.charAt(0).toUpperCase() + platform.slice(1);
  ctx.font = '12px "DejaVu Sans", sans-serif';
  ctx.textBaseline = 'top';

  const segments = [gameName, platformName, 'Single Elimination'];
  const segWidths = segments.map(s => ctx.measureText(s).width);
  const dotWidth = ctx.measureText('  \u2022  ').width;
  const totalMetaW = segWidths.reduce((a, b) => a + b, 0) + dotWidth * (segments.length - 1);
  let metaX = (width - totalMetaW) / 2;

  segments.forEach((seg, i) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'left';
    ctx.fillText(seg, metaX, curY);
    metaX += segWidths[i];
    if (i < segments.length - 1) {
      ctx.fillStyle = hexToRgba(accent, 0.6);
      ctx.fillText('  \u2022  ', metaX, curY);
      metaX += dotWidth;
    }
  });

  // === Start date ===
  curY += 20;
  if (startDate) {
    // "STARTS" label
    ctx.fillStyle = hexToRgba(accent, 0.9);
    ctx.font = 'bold 10px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('S T A R T S', width / 2, curY);
    curY += 18;

    // Date value
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'bold 16px "DejaVu Sans", sans-serif';
    ctx.fillText(formatDate(startDate), width / 2, curY);
    curY += 24;
  }

  // === Prize pool cards ===
  if (hasPrizes) {
    const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const entries = prizePool!.map(entry => {
      const label = entry.place === 1 ? '1st' : entry.place === 2 ? '2nd' : entry.place === 3 ? '3rd' : `${entry.place}th`;
      return { ...entry, label };
    });

    const cardW = 130;
    const cardH = 56;
    const cardGap = 12;
    const totalCardsW = entries.length * cardW + (entries.length - 1) * cardGap;
    const startX = (width - totalCardsW) / 2;
    const prizeY = curY + 6;

    entries.forEach((entry, i) => {
      const medalColor = MEDAL_COLORS[entry.place - 1] || 'rgba(255, 255, 255, 0.4)';
      const cardX = startX + i * (cardW + cardGap);
      const cx = cardX + cardW / 2;

      // Card background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      roundRect(ctx, cardX, prizeY, cardW, cardH, 10);
      ctx.fill();

      // Colored top edge
      const cardTopGrad = ctx.createLinearGradient(cardX, prizeY, cardX + cardW, prizeY);
      cardTopGrad.addColorStop(0, 'transparent');
      cardTopGrad.addColorStop(0.3, hexToRgba(medalColor, 0.5));
      cardTopGrad.addColorStop(0.7, hexToRgba(medalColor, 0.5));
      cardTopGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cardTopGrad;
      ctx.fillRect(cardX + 8, prizeY, cardW - 16, 2);

      // Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      roundRect(ctx, cardX, prizeY, cardW, cardH, 10);
      ctx.stroke();

      // Place label
      ctx.fillStyle = medalColor;
      ctx.font = 'bold 11px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(entry.label, cx, prizeY + 10);

      // Prize amount
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px "DejaVu Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(entry.prize, cx, prizeY + 28);
    });

    curY = prizeY + cardH + 10;
  }

  // === Bottom accent line ===
  const botLine = ctx.createLinearGradient(0, 0, width, 0);
  botLine.addColorStop(0, 'transparent');
  botLine.addColorStop(0.3, hexToRgba(accent, 0.2));
  botLine.addColorStop(0.7, hexToRgba(accent, 0.2));
  botLine.addColorStop(1, 'transparent');
  ctx.fillStyle = botLine;
  ctx.fillRect(0, height - 2, width, 2);

  // === Bottom URL ===
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.font = '11px "DejaVu Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('1v1leaderboards.com', width / 2, height - 8);

  return canvas.toBuffer('image/png');
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const test = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
