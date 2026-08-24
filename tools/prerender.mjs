/**
 * Pre-renders the Galician and English pages into dist/gl/ and dist/en/.
 *
 * The site translates client-side, which means a crawler that does not execute
 * JavaScript sees only Spanish. Search engines then have one indexable page
 * instead of three, and the hreflang alternates all point at identical HTML.
 *
 * This applies each dictionary to the markup at build time, so every language
 * is a real, server-rendered document at its own clean URL.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BASE = 'https://www.xn--troquia-9za.com';

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const I18N = eval('(' + html.match(/const I18N = (\{[\s\S]*?\n\});/)[1] + ')');
const LOCALES = { es: 'es_ES', gl: 'gl_ES', en: 'en_GB' };
const PATHS = { es: '/', gl: '/gl/', en: '/en/' };

const attr = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function render(lang) {
  const d = I18N[lang];
  let out = html;

  // Element text
  out = out.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (m, open, tag, key, _inner, close) =>
      d[key] != null ? open + attr(d[key]).replace(/&quot;/g, '"') + close : m);

  // Attribute-carried strings
  out = out.replace(/(\sdata-i18n-content="([^"]+)"[^>]*\scontent=")[^"]*(")/g,
    (m, a, key, z) => d[key] != null ? a + attr(d[key]) + z : m);
  out = out.replace(/(\scontent="[^"]*"[^>]*\sdata-i18n-content="([^"]+)")/g, m => m);
  out = out.replace(/(\sdata-i18n-alt="([^"]+)"[^>]*\salt=")[^"]*(")/g,
    (m, a, key, z) => d[key] != null ? a + attr(d[key]) + z : m);
  out = out.replace(/(\salt="[^"]*"[^>]*\sdata-i18n-alt="([^"]+)")/g, m => m);
  out = out.replace(/(\sdata-i18n-aria-label="([^"]+)"[^>]*\saria-label=")[^"]*(")/g,
    (m, a, key, z) => d[key] != null ? a + attr(d[key]) + z : m);

  // Document language, title, canonical, alternates, og:locale
  out = out.replace(/<html lang="[^"]*">/, `<html lang="${lang}">`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(d['meta.title'])}</title>`);
  out = out.replace(/(<meta name="description"[^>]*content=")[^"]*(")/,
    (m, a, z) => a + attr(d['meta.description']) + z);
  out = out.replace(/(<meta property="og:locale" content=")[^"]*(")/, `$1${LOCALES[lang]}$2`);
  out = out.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${BASE}${PATHS[lang]}$2`);
  out = out.replace(/(<meta property="og:url"[^>]*content=")[^"]*(")/, `$1${BASE}${PATHS[lang]}$2`);

  // Clean per-language URLs replace the old ?lang= alternates.
  out = out.replace(
    /<link rel="alternate" hreflang="es"[^>]*>[\s\S]*?<link rel="alternate" hreflang="x-default"[^>]*>/,
    [`<link rel="alternate" hreflang="es" href="${BASE}/">`,
     `<link rel="alternate" hreflang="gl" href="${BASE}/gl/">`,
     `<link rel="alternate" hreflang="en" href="${BASE}/en/">`,
     `<link rel="alternate" hreflang="x-default" href="${BASE}/">`].join('\n'));

  // /gl/ and /en/ live one level down, so relative asset paths would resolve
  // to /gl/img/... and 404. Make them root-relative for the subdirectories.
  if (lang !== 'es') {
    out = out.replace(/(\s(?:src|href)=")(?!https?:|data:|mailto:|tel:|#|\/)/g, '$1/');
    // Both srcset and imagesrcset hold comma-separated candidates, each of
    // which needs rewriting — not just the first.
    out = out.replace(/(\s(?:image)?srcset=")([^"]+)(")/g, (m, a, list, z) =>
      a + list.split(',').map(x => {
        const t = x.trim();
        return /^(https?:|data:|\/)/.test(t) ? t : '/' + t;
      }).join(', ') + z);
  }

  // Tell the runtime which language this document already is, so it does not
  // repaint on load or override a deliberate URL choice.
  out = out.replace('<body class="no-js">', `<body class="no-js" data-prerendered="${lang}">`);

  return out;
}

fs.writeFileSync(path.join(DIST, 'index.html'), render('es'));
for (const lang of ['gl', 'en']) {
  const dir = path.join(DIST, lang);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render(lang));
}
console.log('pre-rendered: /, /gl/, /en/');
