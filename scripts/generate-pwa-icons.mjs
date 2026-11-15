import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public');

/** favicon과 같은 깃발 엠블럼. any/maskable 둘 다 동일 도안, maskable만 여백을 둠. */
function emblemSvg(size, { pad = 0 } = {}) {
  const inner = size - pad * 2;
  const s = inner / 64;
  const o = pad;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="#1c1917"/>
  <g transform="translate(${o} ${o}) scale(${s})">
    <rect x="15" y="10" width="4" height="46" rx="2" fill="#d6d3d1"/>
    <path d="M19 12 H50 L43 23 L50 34 H19 Z" fill="#dc2626"/>
    <circle cx="32" cy="23" r="5" fill="#fbbf24"/>
  </g>
</svg>`;
}

async function writePng(name, size, opts) {
  const png = await sharp(Buffer.from(emblemSvg(size, opts))).png().toBuffer();
  await writeFile(path.join(outDir, name), png);
  console.log(`${name} (${size}×${size}, ${png.length} bytes)`);
}

await mkdir(outDir, { recursive: true });
await writePng('pwa-192.png', 192);
await writePng('pwa-512.png', 512);
// 마스크 가능 아이콘: 안전 영역(~80%) 안에 도안
await writePng('pwa-maskable-512.png', 512, { pad: 64 });
await writePng('apple-touch-icon.png', 180);
