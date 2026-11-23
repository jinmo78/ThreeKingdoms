// 카카오·SNS 공유용 OG 이미지 (1200×630)
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'og.png');
const title = path.join(root, 'public', 'title.webp');

const W = 1200;
const H = 630;

// 양피지·한지 톤 바탕 + 은은한 그라데이션
const bgSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EFE6D5"/>
      <stop offset="45%" stop-color="#E6DBC6"/>
      <stop offset="100%" stop-color="#DCD0B8"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect width="100%" height="100%" fill="#E2B866" opacity="0.05"/>
</svg>`);

const bg = await sharp(bgSvg).png().toBuffer();

const art = await sharp(title)
  .resize(980, 520, { fit: 'inside', withoutEnlargement: false })
  .png()
  .toBuffer();

const artMeta = await sharp(art).metadata();
const left = Math.round((W - (artMeta.width ?? 980)) / 2);
const top = Math.round((H - (artMeta.height ?? 520)) / 2);

const png = await sharp(bg)
  .composite([{ input: art, left, top }])
  .png()
  .toBuffer();

await writeFile(out, png);
console.log(`og.png (${W}×${H}, ${png.length} bytes)`);
