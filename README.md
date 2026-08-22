# Troquiña S.L.

[![Netlify Status](https://api.netlify.com/api/v1/badges/40059b41-8916-445a-81e1-d01285ad6255/deploy-status)](https://app.netlify.com/sites/troquina/deploys)

Single-page website for Troquiña S.L. — gardening, landscaping and plant nursery in
Baión and Trabanca Badiña (Pontevedra, Galicia).

Trilingual: **Spanish (default) · Galego · English**.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The entire site — markup, CSS and JS in one file. No build step. |
| `DESIGN.md` | Design command: competitive read, palette, type, content architecture. |
| `logo.png`, `garden.jpg`, `img/*.jpg` | Image assets. |

## Running locally

It is a static file — open `index.html`, or serve the folder:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

## Languages

Translations live in the `I18N` object at the bottom of `index.html`, keyed by
`data-i18n` attributes in the markup. To change a string, edit it in all three
dictionaries (`es`, `gl`, `en`).

Language is resolved in this order: `?lang=` query parameter → previous choice in
`localStorage` → browser language → Spanish. Switching updates the text, `<html lang>`,
the document title and the social meta tags without reloading the page.

Deep links: `/?lang=gl`, `/?lang=en`.

## Contact form

The form posts to [Netlify Forms](https://docs.netlify.com/forms/setup/) via
`data-netlify="true"` (form name: `contacto`), with a honeypot field for spam.
Submissions appear in the Netlify dashboard under **Forms**.

## Notes for editing

- Adding a section: give it an `id`, add a `<li>` to `.nav-links`, and add the labels to
  all three dictionaries. Scroll-spy and the mobile menu pick it up automatically.
- Elements with class `rv` fade in on scroll. Skip the class for anything that must be
  visible immediately.
- Opening hours are deliberately linked to Google Maps rather than hard-coded, so they
  cannot go stale.
