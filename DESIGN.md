# Troquiña S.L. — Design Command

The brief that drives the redesign. Anything added to the site later should be checkable
against this document.

---

## 1. Where we start

The previous site was a single Tailwind-CDN page with three grey cards stacked on a grey
page: a header image, an "about" paragraph, a bulleted list of services, and two addresses.
It was honest but generic — it read as a business card, not as a company that has been
shaping gardens in the Salnés since 1994. Problems, concretely:

| Issue | Effect |
| --- | --- |
| Hero hidden on mobile (`hidden md:block`) | Most visitors landed on a grey box |
| Services as a bullet list | No hierarchy, nothing scannable, no proof |
| No call to action anywhere | A visitor who wanted a quote had to hunt for a phone number |
| Spanish only | Loses Galician-speaking locals and non-Spanish second-home owners |
| Tailwind CDN + runtime JIT | Flash of unstyled content, ~100 KB of JS to draw grey cards |
| No structured data, no canonical, broken `og:image` (unencoded ñ in the URL) | Poor local-search presence |

## 2. Competitive read

Sampled the Galician and Pontevedra field: Viveros O Piñeiro, Viveiros Outón, Grupo Edén,
Nuevos Jardines, Dixardín, Erva Xardinería, Adoa.

**What they all do (table stakes — we must match):**
- Services split into named blocks (design / creation / maintenance), not a bullet list.
- A visible quote request, phone-first, above the fold.
- Real photography of their own work, not only stock.
- Physical address plus map link — this is a business people drive to.

**Where they are weak (our opening):**
- Nearly all are Spanish-only. Only a handful of the smaller studios (Dixardín, Adoa)
  publish in Galego. **Nobody in the local field is trilingual.** For a company on the
  Arousa estuary — Galician-speaking locals, Spanish-speaking region, foreign second-home
  and holiday-let owners — ES / GL / EN is a genuine differentiator, not decoration.
- Visually they cluster on the same template look: full-width stock slider, green-on-white,
  Open Sans, four icon boxes. Almost none commit to a real typographic voice.
- The nursery side and the landscaping side are usually presented as one blur. Troquiña
  actually has both — a garden centre *and* a crew — and that combination should be the
  spine of the page.

**Positioning that follows:** *the nursery that also builds and keeps your garden* —
30+ years, two sites, own stock, trained crew, and it will talk to you in your language.

## 3. Design command

> Build one page, in three languages, that feels grown rather than assembled.
> Deep evergreen and terracotta on warm paper; a serif with real character for the
> headlines and a clean neutral for everything else. Generous whitespace, wide soft-cornered
> photography, no drop-shadow boxes. Every screen answers one question and hands the
> visitor a phone number. It must load instantly on a phone at the garden gate,
> with no build step and no framework.

### 3.1 Voice
Plain, warm, specific. Never "soluciones integrales de gestión de espacios verdes."
Say what is done, where, and since when. Numbers where we have them (1994, two centres).
No claims the business has not made — the service list stays inside what Troquiña
actually offers.

### 3.2 Colour

Taken from the existing logo (teal-green wordmark, terracotta mower) and pushed to a
palette with enough range to build a page with.

| Token | Value | Role |
| --- | --- | --- |
| `--ink` | `#12211C` | Body text, deepest sections |
| `--pine` | `#1E3A32` | Primary surface — nav, footer, hero scrim |
| `--moss` | `#2F5D52` | Heritage teal, evolved. Headings, primary buttons |
| `--sage` | `#8FA98E` | Secondary accents, rules, icon fills |
| `--clay` | `#C1502E` | Terracotta. Single accent — CTAs, links, highlights |
| `--paper` | `#FAF7F0` | Page ground. Warm, not white |
| `--sand` | `#EFE9DC` | Alternating section bands, cards |

One accent only. Terracotta is reserved for things the visitor can act on, so
"orange = clickable" holds everywhere on the page.

### 3.3 Type

- **Display:** Fraunces — a soft, high-contrast serif with organic detailing. Warmth and
  age without looking rustic-kitsch. Used at large optical sizes only.
- **Text:** Inter. Neutral, excellent at 15–18 px on phones.
- Fluid scale via `clamp()`; body never below 16 px; measure capped near 65ch.

### 3.4 Layout & motion

- Twelve-column feel, but built on CSS grid with `auto-fit` so it degrades to one column
  without media-query sprawl.
- Full-bleed photo bands alternating with `--sand` content bands, so the page has rhythm
  when you thumb through it.
- Cards: 1 px border + generous radius, no drop shadows. Depth comes from colour, not blur.
- Motion is a fade-and-rise on first scroll into view, 400 ms, once. Fully removed under
  `prefers-reduced-motion`.

### 3.5 Content architecture (single page, in order)

1. **Hero** — who, where, since when + contact CTA + phone.
2. **Trust strip** — 1994 · two centres · 30+ years · all of Galicia.
3. **Services** — six blocks, each one an activity the business is actually listed as
   doing.
4. **Nursery** — what is on the tables at the two centres, photo band.
5. **About** — 1994, qualified and trained staff, the two sites.
6. **Locations** — both addresses as first-class cards with map, phone, directions.
7. **Contact** — form plus direct phone lines and Instagram.
8. **Footer** — Instagram, CIF, legal line.

### 3.5.1 Sourcing rule — no invented copy

Every factual claim on the page traces to something Troquiña or a public register
states. The service list, the nursery product list, the founding year and the
"plantilla cualificada y formada para cada una de las actividades" line all come from
the company's own description and its directory entries; the CIF and legal form come
from the mercantile register.

Deliberately **not** on the page, because nothing verifiable was found:

| Omitted | Why |
| --- | --- |
| Opening hours | Not published anywhere current. Linked to Google Maps instead, so they can never go stale on us. |
| A "how we work" / process section | An earlier draft invented a four-step visit → quote → work → upkeep flow. Removed — the owners should describe their real process. |
| Client types (communities, businesses) | Plausible but unverified. |
| Team size, project counts, testimonials | Employee count appears in the register but changes yearly; not worth hard-coding. |
| Specific techniques, species, plant ranges | Not documented publicly. |

If the owners supply any of the above, it belongs on the page — but it has to come from
them, not from inference.

### 3.6 Languages

- Spanish (default), Galego, English. Full parity — no half-translated sections.
- Client-side dictionary keyed by `data-i18n`; switching updates text, `<html lang>`,
  meta description, `og:*`, and the document title.
- Order of resolution: `?lang=` query → `localStorage` → `navigator.language` → `es`.
  Galician detection covers `gl` and `gl-ES`.
- Choice persists across visits. Switching never scrolls or reloads the page.

### 3.7 Technical constraints

- **One file.** `index.html`, no build step, no framework, no runtime CSS engine — it
  deploys to Netlify as-is, same as today.
- CSS custom properties + vanilla JS only. Google Fonts is the single external request.
- Progressive enhancement: with JS off the page renders complete in Spanish.
- Accessibility: skip link, visible focus rings, labelled controls, `aria-current` on the
  active language, 4.5:1 contrast minimum on text.
- SEO: canonical, Open Graph with an absolute punycode URL (fixes the old broken ñ URL),
  `hreflang` alternates, and `LocalBusiness` JSON-LD for **both** branches with their real
  addresses, phones and coordinates.
