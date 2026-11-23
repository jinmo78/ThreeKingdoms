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

// 남색 궁정 톤 바탕 + 타이틀 아트를 가운데에 얹음
const bg = await sharp({
  create: {
    width: W,
    height: H,
    channels: 3,
    background: { r: 16, g: 24, b: 38 },
  },
}).png().toBuffer();

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
