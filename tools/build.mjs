/**
 * Assembles the publishable site into dist/.
 *
 * Cloudflare Pages uploads everything in the directory it is given, so the
 * repo root cannot be deployed directly — it would publish package.json,
 * the tests, the CI workflow and the 498KB unreferenced hero source.
 * This copies only what the site actually serves.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// Files and directories that make up the published site.
const INCLUDE = [
  'index.html',
  '_headers',
  'robots.txt',
  'sitemap.xml',
  'logo.png',
  'apple-touch-icon.png',
  'img/opt',
  'img/garden1.jpg',
  'img/garden2.jpg',
  'img/garden3.jpg',
  'functions',
];

let files = 0, bytes = 0;
for (const rel of INCLUDE) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) { console.error(`missing: ${rel}`); process.exit(1); }
  const dest = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  for (const f of fs.statSync(src).isDirectory()
      ? fs.readdirSync(src, { recursive: true }).map(f => path.join(src, f))
      : [src]) {
    const st = fs.statSync(f);
    if (st.isFile()) { files++; bytes += st.size; }
  }
}

console.log(`built dist/  ${files} files, ${(bytes / 1024).toFixed(0)}KB`);

// Guard: nothing that should stay private may end up in dist.
const FORBIDDEN = ['package.json', 'package-lock.json', 'README.md', 'DESIGN.md',
                   'garden.jpg', 'img.jpg', 'tests', 'tools', '.github', 'node_modules'];
const leaked = FORBIDDEN.filter(f => fs.existsSync(path.join(DIST, f)));
if (leaked.length) { console.error('leaked into dist:', leaked); process.exit(1); }
console.log('no private files in dist');
