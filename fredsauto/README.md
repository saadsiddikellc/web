# Fred’s Auto — demo landing page

A single-page site for **Fred’s Auto**, an automotive electrical specialist.

> **This is a demo website.** The phone number, email address and service area are
> clearly-marked placeholders. Nothing on the page claims experience, certifications,
> qualifications, awards, reviews, customer numbers, partnerships, guarantees or prices,
> because none were supplied.

## Stack

Plain HTML, CSS and vanilla JavaScript. No framework, no build step, no runtime
dependencies — open `index.html` and it runs.

```
fredsauto/
├── index.html              the whole site
├── 404.html                branded not-found page (Netlify serves it automatically)
├── netlify.toml            headers, caching, redirects
├── robots.txt
├── assets/
│   ├── css/styles.css      design tokens + all styling
│   ├── js/site.js          nav, mobile menu, scroll reveals, form validation
│   ├── favicon.svg         the brand mark (source of truth for every icon)
│   ├── favicon.ico         16 + 32 px, for older browsers
│   ├── apple-touch-icon.png
│   └── og-image.png        1200×630 social card
└── scripts/
    ├── generate-assets.mjs regenerates the PNG/ICO assets
    └── set-origin.mjs      stamps the live domain into the absolute URLs
```

## Develop

Any static server works:

```bash
python3 -m http.server 8000     # → http://localhost:8000
```

Opening `index.html` directly from disk also works; all paths are relative.

## Deploy to Netlify

Nothing to compile, so either route works.

**Drag and drop (fastest).** Open <https://app.netlify.com/drop> and drop this folder —
or the zip of it — onto the page. Netlify reads `netlify.toml` from the root of what you
drop, so headers, caching and redirects apply straight away. The site is live in seconds.

**Connect the Git repo.** In *Add new site → Import an existing project*, pick the repo
and set:

| Setting | Value |
| --- | --- |
| Base directory | `fredsauto` |
| Build command | *(leave empty)* |
| Publish directory | `fredsauto` |

The repo root holds a separate, unrelated Astro site with its own `netlify.toml`, so the
base directory matters — without it Netlify would try to build that project instead.

### After the first deploy (optional, 10 seconds)

Netlify assigns a domain such as `celebrated-tarsier-1a2b3c.netlify.app`. The page ships
with relative `canonical`, `og:url` and `og:image` values, which are valid and work as-is.
To make them absolute — which the fussier social scrapers prefer — run:

```bash
node scripts/set-origin.mjs https://your-site.netlify.app
```

Then redeploy. Re-run it any time the domain changes; it re-anchors the existing paths
rather than appending, so it stays correct.

### What `netlify.toml` sets

- **Security headers** on every response: `nosniff`, `DENY` framing, a strict
  referrer policy and a locked-down `Permissions-Policy`.
- **Caching.** Nothing is fingerprinted, so CSS and JS must revalidate — otherwise an
  update would never reach a browser that cached the old file. Revalidation costs a 304
  on ~44 KB, and Netlify purges its CDN on each deploy anyway. Icons and the social card
  are stable, so they cache for a week.
- **Redirects.** `/home` → `/` permanently; `/book`, `/contact` and `/services` jump to
  the matching section. `README.md` and `scripts/*` return 404 — they travel with the
  folder so it stays editable, but they are not part of the site.
- Any other unmatched path falls through to `404.html` automatically.

### Any other host

The same folder works unchanged on Vercel, GitHub Pages, Cloudflare Pages, S3 or plain
nginx — only `netlify.toml` is Netlify-specific, and it is ignored elsewhere. You would
need to re-express the headers and redirects in that host's own format.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#ffffff` | page background |
| `--ink` | `#0b0c0d` | headings, primary buttons |
| `--ink-3` | `#4e5257` | body copy |
| `--graphite` | `#6e7378` | metallic secondary — labels, icons |
| `--graphite-2` | `#9aa0a6` | hairlines and decoration only, never text |
| `--signal` | `#64748b` | cool-gray accent — pulses and active states |
| `--char` | `#101215` | the one dark section (final CTA) |

No yellow, no gradients beyond a single hairline sweep, no photography.

**Logo.** One mark, defined once in `assets/favicon.svg` and inlined in the page: a
charcoal plate carrying a white diagnostic pulse and a graphite terminal node. The
desktop lockup pairs that mark with the `FRED’S AUTO` wordmark and its tagline; below
420 px the tagline drops and the mark plus wordmark carry the brand. Every raster icon
is generated from the same SVG, so the mark only ever has to be edited in one place.

### Regenerating icons and the social card

Needs Playwright and a Chromium build. `PLAYWRIGHT_MODULE` points at a global install.

```bash
PLAYWRIGHT_MODULE=/path/to/playwright/index.js node scripts/generate-assets.mjs
convert assets/favicon-16.png assets/favicon-32.png assets/favicon.ico
```

Output is committed, so this only needs re-running when the branding changes.

## Accessibility and resilience

- Every text/background pair meets WCAG AA (verified programmatically — the
  `--graphite-2` token fails at text sizes, which is why it is decoration-only).
- One `h1`, no skipped heading levels, no duplicate ids, every field labelled.
- Skip link, visible focus rings, full keyboard operation. The mobile menu traps
  focus, closes on `Escape` and returns focus to its toggle.
- Entrance and reveal animations are scoped to `.js-ready`, so with JavaScript
  disabled or broken the page renders fully — nothing is hidden behind a script.
- `prefers-reduced-motion` removes the pulses and transitions and shows all content.

## The contact form

Front-end only, and it says so on the page. It validates name, contact (accepts either
a phone number or an email address), vehicle, issue description and an optional
preferred date that cannot be in the past; errors are announced through
`aria-invalid` + `aria-describedby`, and submitting focuses the first invalid field.

**Nothing is sent** — there is no backend and no network request. To make it real, post
`new FormData(form)` from the submit handler in `assets/js/site.js` and replace the
success copy.
