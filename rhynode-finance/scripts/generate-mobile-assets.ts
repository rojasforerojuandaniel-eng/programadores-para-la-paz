import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ASSETS_DIR = path.resolve(__dirname, '../apps/mobile/assets');

const ICON_SIZE = 1024;
const SPLASH_WIDTH = 1242;
const SPLASH_HEIGHT = 2436;

const DARK_BG = '#0A0A0F';
const EMERALD = '#10B981';
const WHITE = '#FFFFFF';

function iconSvg(size: number, background: string): string {
  const logoSize = Math.round(size * 0.5);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;
  const fontSize = Math.round(logoSize * 0.6);
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${background}" rx="${size * 0.22}" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${EMERALD}" />
      <text x="${cx}" y="${cy}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${WHITE}" text-anchor="middle" dominant-baseline="central">R</text>
    </svg>
  `;
}

function splashSvg(width: number, height: number): string {
  const logoSize = Math.round(width * 0.35);
  const cx = width / 2;
  const cy = height * 0.42;
  const r = logoSize / 2;
  const fontSize = Math.round(logoSize * 0.55);
  const taglineY = height * 0.62;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="${DARK_BG}" />
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${EMERALD}" />
      <text x="${cx}" y="${cy}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${WHITE}" text-anchor="middle" dominant-baseline="central">R</text>
      <text x="${cx}" y="${taglineY}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.07)}" font-weight="600" fill="${WHITE}" text-anchor="middle">Rhynode</text>
      <text x="${cx}" y="${taglineY + width * 0.09}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.round(width * 0.035)}" fill="#9CA3AF" text-anchor="middle">Finanzas personales y empresariales</text>
    </svg>
  `;
}

async function generate() {
  await fs.mkdir(ASSETS_DIR, { recursive: true });

  const iconBuffer = await sharp(Buffer.from(iconSvg(ICON_SIZE, DARK_BG)))
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(ASSETS_DIR, 'icon.png'), iconBuffer);

  const adaptiveBuffer = await sharp(Buffer.from(iconSvg(ICON_SIZE, 'none')))
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(ASSETS_DIR, 'adaptive-icon.png'), adaptiveBuffer);

  const splashBuffer = await sharp(Buffer.from(splashSvg(SPLASH_WIDTH, SPLASH_HEIGHT)))
    .resize(SPLASH_WIDTH, SPLASH_HEIGHT)
    .png()
    .toBuffer();
  await fs.writeFile(path.join(ASSETS_DIR, 'splash.png'), splashBuffer);

  console.log('Generated mobile assets at', ASSETS_DIR);
}

void generate();
