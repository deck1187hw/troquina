/**
 * Regenerates img/opt/ from the original images in the repository root.
 *
 *   npm i sharp
 *   node tools/optimise-images.mjs
 *
 * Only run this when a source image changes. The output is committed, so the
 * site itself still needs no build step.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'img', 'opt');
fs.mkdirSync(OUT, { recursive: true });

const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + 'KB';
const log = (name, file, note = '') => console.log(name.padEnd(20), kb(file).padStart(7), note);

// Hero — responsive widths. The <picture> in index.html lists these exact names.
for (const w of [640, 1024, 1600, 1920]) {
  const out = path.join(OUT, `hero-${w}.webp`);
  await sharp(path.join(ROOT, 'garden.jpg')).resize({ width: w }).webp({ quality: 72 }).toFile(out);
  log(`hero-${w}.webp`, out);
}

// JPEG fallback for browsers without WebP (very few, but it costs nothing).
const heroFallback = path.join(OUT, 'hero-1600.jpg');
await sharp(path.join(ROOT, 'garden.jpg'))
  .resize({ width: 1600 }).jpeg({ quality: 76, progressive: true, mozjpeg: true }).toFile(heroFallback);
log('hero-1600.jpg', heroFallback, 'fallback');

// Nursery collage.
for (const n of ['garden1', 'garden2', 'garden3']) {
  const out = path.join(OUT, `${n}.webp`);
  await sharp(path.join(ROOT, 'img', `${n}.jpg`)).webp({ quality: 76 }).toFile(out);
  log(`${n}.webp`, out);
}

// Social share card at the 1200x630 crawlers expect.
const card = path.join(OUT, 'og-card.jpg');
await sharp(path.join(ROOT, 'garden.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'centre' }).jpeg({ quality: 80, mozjpeg: true }).toFile(card);
log('og-card.jpg', card, '1200x630');
