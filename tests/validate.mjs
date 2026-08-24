/**
 * Static checks that run in CI on every push and pull request.
 * No browser required — parses index.html and the repo tree.
 */
import fs from 'node:fs';

let failures = 0;
const fail = m => { console.error('  FAIL ' + m); failures++; };
const pass = m => console.log('  ok   ' + m);

const html = fs.readFileSync('index.html', 'utf8');

// --- i18n parity ---------------------------------------------------------
const I18N = eval('(' + html.match(/const I18N = (\{[\s\S]*?\n\});/)[1] + ')');
const langs = Object.keys(I18N);
const used = new Set();
for (const re of [/data-i18n="([^"]+)"/g, /data-i18n-content="([^"]+)"/g,
                  /data-i18n-placeholder="([^"]+)"/g, /data-i18n-aria-label="([^"]+)"/g,
                  /data-i18n-alt="([^"]+)"/g]) {
  let m; while ((m = re.exec(html))) used.add(m[1]);
}
const base = Object.keys(I18N.es);
for (const k of used)
  for (const l of langs)
    if (!(k in I18N[l])) fail(`i18n: key "${k}" missing from "${l}"`);
for (const l of langs) {
  const missing = base.filter(k => !(k in I18N[l]));
  if (missing.length) fail(`i18n: ${l} missing ${missing.length} keys: ${missing.slice(0,5)}`);
}
if (!failures) pass(`i18n parity: ${base.length} keys x ${langs.length} languages`);

// --- duplicate ids -------------------------------------------------------
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dup = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
dup.length ? fail(`duplicate id(s): ${dup}`) : pass('no duplicate ids');

// --- nav links resolve ---------------------------------------------------
for (const block of html.matchAll(/class="nav-links"[\s\S]*?<\/ul>/g))
  for (const a of block[0].matchAll(/href="#([^"]+)"/g))
    if (!ids.includes(a[1])) fail(`nav link points at missing #${a[1]}`);
pass('nav links resolve');

// --- JSON-LD parses ------------------------------------------------------
try {
  JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  pass('JSON-LD parses');
} catch (e) { fail('JSON-LD invalid: ' + e.message); }

// --- referenced local assets exist ---------------------------------------
const refs = [...html.matchAll(/(?:src|href|srcset)="((?!https?:|data:|#|tel:|mailto:|\/api\/)[^"]+)"/g)]
  .map(m => m[1]).flatMap(s => s.split(',').map(x => x.trim().split(' ')[0])).filter(Boolean);
const missing = [...new Set(refs)].filter(f => !fs.existsSync(f.replace(/^\//, '')));
missing.length ? fail(`missing asset(s): ${missing}`) : pass(`all ${new Set(refs).size} local assets exist`);

// --- image dimensions match the real files -------------------------------
const png = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
for (const m of html.matchAll(/<img[^>]+src="([^"]+\.png)"[^>]*width="(\d+)"[^>]*height="(\d+)"/g)) {
  const [, src, w, h] = m;
  if (!fs.existsSync(src)) continue;
  const real = png(src);
  if (real.w !== +w || real.h !== +h)
    fail(`${src}: declared ${w}x${h} but file is ${real.w}x${real.h} (causes layout shift)`);
  else pass(`${src} dimensions match (${w}x${h})`);
}

// --- _headers: no path may get two Cache-Control values -------------------
const rules = []; let cur = null;
for (const line of fs.readFileSync('_headers', 'utf8').split('\n')) {
  if (line.startsWith('/')) { cur = { pat: line.trim(), hs: [] }; rules.push(cur); }
  else if (/^\s+\S+:/.test(line) && cur) cur.hs.push(line.trim().split(':')[0].toLowerCase());
}
const match = (p, pat) => pat.endsWith('*') ? p.startsWith(pat.slice(0, -1)) : p === pat;
for (const p of ['/', '/index.html', '/img/opt/hero-640.webp', '/img/garden3.jpg',
                 '/logo.png', '/robots.txt', '/sitemap.xml', '/api/contact']) {
  const n = rules.filter(r => match(p, r.pat) && r.hs.includes('cache-control')).length;
  if (n > 1) fail(`_headers: ${p} matches ${n} Cache-Control rules (values concatenate)`);
}
if (!failures) pass('_headers: exactly one Cache-Control per path');

// --- no stale Netlify references -----------------------------------------
if (/data-netlify|netlify-honeypot/.test(html))
  fail('index.html still contains Netlify form attributes (site is on Cloudflare Pages)');
else pass('no stale Netlify form wiring');

// --- pre-rendered language pages -----------------------------------------
if (fs.existsSync('dist/index.html')) {
  const EXPECT = {
    'dist/index.html':    { lang: 'es', canon: 'https://www.xn--troquia-9za.com/' },
    'dist/gl/index.html': { lang: 'gl', canon: 'https://www.xn--troquia-9za.com/gl/' },
    'dist/en/index.html': { lang: 'en', canon: 'https://www.xn--troquia-9za.com/en/' },
  };
  const titles = new Set(), h1s = new Set();
  for (const [file, want] of Object.entries(EXPECT)) {
    if (!fs.existsSync(file)) { fail(`prerender: ${file} missing`); continue; }
    const doc = fs.readFileSync(file, 'utf8');
    const lang = (doc.match(/<html lang="([^"]+)"/) || [])[1];
    if (lang !== want.lang) fail(`prerender: ${file} has lang="${lang}", expected "${want.lang}"`);
    const canon = (doc.match(/rel="canonical" href="([^"]+)"/) || [])[1];
    if (canon !== want.canon) fail(`prerender: ${file} canonical is ${canon}, expected ${want.canon}`);
    titles.add((doc.match(/<title>([\s\S]*?)<\/title>/) || [])[1]);
    h1s.add((doc.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1]);
    // every hreflang must be present on every page
    for (const hl of ['es', 'gl', 'en', 'x-default'])
      if (!doc.includes(`hreflang="${hl}"`)) fail(`prerender: ${file} missing hreflang="${hl}"`);
    // subdirectory pages must not use relative asset paths
    if (file.includes('/gl/') || file.includes('/en/')) {
      const rel = [...doc.matchAll(/\s(?:src|href)="(?!https?:|data:|mailto:|tel:|#|\/)([^"]+)"/g)].map(m => m[1]);
      if (rel.length) fail(`prerender: ${file} has relative asset paths that 404 from a subdirectory: ${rel.slice(0,3)}`);
      // every candidate in every srcset/imagesrcset must be root-relative too
      for (const m of doc.matchAll(/\s(?:image)?srcset="([^"]+)"/g))
        for (const cand of m[1].split(',')) {
          const url = cand.trim().split(/\s+/)[0];
          if (url && !/^(https?:|data:|\/)/.test(url))
            fail(`prerender: ${file} srcset candidate "${url}" is relative and will 404`);
        }
    }
  }
  if (titles.size !== 3) fail(`prerender: expected 3 distinct titles, got ${titles.size}`);
  if (h1s.size !== 3) fail(`prerender: expected 3 distinct h1 headings, got ${h1s.size}`);
  if (!failures) pass('pre-rendered pages: 3 languages, distinct titles/h1, correct canonicals and hreflang');
} else {
  console.log('  --   dist/ not built; skipping pre-render checks (run npm run build first)');
}

console.log();
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log('all static checks passed');
