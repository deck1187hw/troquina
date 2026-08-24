/**
 * Browser checks: layout across widths and languages, plus rendered-pixel
 * contrast of text over the hero photograph.
 *
 * These catch the class of bug static analysis cannot see — the nav CTA that
 * rendered dark-on-dark, and the hero eyebrow that sat at 1.5:1 over the photo.
 *
 *   node tests/browser.mjs [baseUrl]
 */
import { chromium } from 'playwright';
import sharp from 'sharp';

const BASE = process.argv[2] || 'http://localhost:8000';
const WIDTHS = [320, 390, 430, 768, 1024, 1180, 1280, 1440, 1920];
const LANGS = ['es', 'gl', 'en'];
let failures = 0;
const fail = m => { console.error('  FAIL ' + m); failures++; };

const browser = await chromium.launch();

// --- layout sweep --------------------------------------------------------
for (const lang of LANGS) {
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/?lang=${lang}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => {
      const de = document.documentElement;
      const nav = document.querySelector('.nav-in').getBoundingClientRect();
      const cta = document.querySelector('.btn-nav');
      const ctaOver = getComputedStyle(cta).display !== 'none'
        ? Math.round(cta.getBoundingClientRect().right - nav.right) : 0;
      const rows = new Set([...document.querySelectorAll('.nav-links a')]
        .filter(a => getComputedStyle(a).display !== 'none')
        .map(a => Math.round(a.getBoundingClientRect().top))).size;
      const wide = [...new Set([...document.querySelectorAll('body *')].filter(el => {
        if (el.closest('.skip, .hp')) return false;
        const b = el.getBoundingClientRect();
        return b.width > 0 && (b.right > innerWidth + 1 || b.left < -1);
      }).map(el => el.tagName + '.' + (el.className || '').toString().slice(0, 22)))];
      return { ox: de.scrollWidth - de.clientWidth, ctaOver, rows, wide };
    });
    if (r.ox !== 0) fail(`${lang} @${w}: horizontal overflow ${r.ox}px`);
    if (r.ctaOver > 0) fail(`${lang} @${w}: nav CTA overflows by ${r.ctaOver}px`);
    if (r.rows > 1) fail(`${lang} @${w}: nav wrapped to ${r.rows} rows`);
    if (r.wide.length) fail(`${lang} @${w}: elements past viewport ${r.wide}`);
    await ctx.close();
  }
}
if (!failures) console.log(`  ok   layout: ${WIDTHS.length * LANGS.length} width x language combinations clean`);

// --- rendered contrast over the hero photo -------------------------------
const lum = (r, g, b) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [a, b].sort((m, n) => n - m); return (x + .05) / (y + .05); };

for (const [w, h] of [[390, 844], [1280, 900], [1920, 1080]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?lang=es`, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const boxes = await page.evaluate(() => {
    const out = [];
    for (const sel of ['.hero .eyebrow', '.hero h1', '.hero-in > p:not(.eyebrow)', '.hero-phone']) {
      const el = document.querySelector(sel); if (!el) continue;
      const range = document.createRange(); range.selectNodeContents(el);
      const cs = getComputedStyle(el);
      for (const r of range.getClientRects()) {
        if (r.width < 8 || r.height < 6) continue;
        out.push({ sel, x: Math.max(0, ~~r.x), y: Math.max(0, ~~r.y),
                   width: Math.ceil(r.width), height: Math.ceil(r.height),
                   size: parseFloat(cs.fontSize), weight: +cs.fontWeight, color: cs.color });
      }
    }
    return out;
  });
  // hide the text so we measure only what sits behind it
  await page.addStyleTag({ content: '.hero-in{visibility:hidden !important}' });
  await page.waitForTimeout(200);
  const shot = await page.screenshot({ clip: { x: 0, y: 0, width: w, height: h } });
  const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
  const worst = {};
  for (const b of boxes) {
    let bright = 0;
    for (let x = b.x; x < Math.min(b.x + b.width, info.width); x++)
      for (let y = b.y; y < Math.min(b.y + b.height, info.height); y++) {
        const i = (y * info.width + x) * info.channels;
        bright = Math.max(bright, lum(data[i], data[i + 1], data[i + 2]));
      }
    const [fr, fg, fb] = b.color.match(/\d+(\.\d+)?/g).map(Number);
    const cr = ratio(lum(fr, fg, fb), bright);
    const need = (b.size >= 24 || (b.size >= 18.66 && b.weight >= 700)) ? 3 : 4.5;
    if (!worst[b.sel] || cr < worst[b.sel].cr) worst[b.sel] = { cr, need };
  }
  for (const [sel, v] of Object.entries(worst))
    if (v.cr < v.need) fail(`contrast @${w}: ${sel} is ${v.cr.toFixed(2)}:1, needs ${v.need}:1`);
  await ctx.close();
}
if (!failures) console.log('  ok   hero text contrast meets WCAG AA at all tested widths');

await browser.close();
console.log();
if (failures) { console.error(`${failures} check(s) failed`); process.exit(1); }
console.log('all browser checks passed');
