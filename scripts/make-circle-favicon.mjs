import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SIZE = 64;
const root = resolve(process.cwd());
const src = resolve(root, 'public/Photos/dalatech_logo_v3.jpg');
const out = resolve(root, 'public/favicon-circle.png');

const r = SIZE / 2;
const mask = Buffer.from(
  `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
     <circle cx="${r}" cy="${r}" r="${r}" fill="white"/>
   </svg>`,
);

const logoSize = Math.round(SIZE * 0.78);

const logo = await sharp(readFileSync(src))
  .resize(logoSize, logoSize, {
    fit: 'contain',
    background: { r: 6, g: 14, b: 36, alpha: 1 },
  })
  .toBuffer();

const offset = Math.round((SIZE - logoSize) / 2);

const composed = await sharp({
  create: {
    width: SIZE,
    height: SIZE,
    channels: 4,
    background: { r: 6, g: 14, b: 36, alpha: 1 },
  },
})
  .composite([
    { input: logo, top: offset, left: offset },
    { input: mask, blend: 'dest-in' },
  ])
  .png()
  .toBuffer();

writeFileSync(out, composed);
console.log(`wrote ${out} (${composed.length} bytes)`);
