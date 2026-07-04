# PrivateRemix — Website (privateremix.com)

## What This Is

The marketing + SEO website for **PrivateRemix**, a native macOS file-conversion app.
The app itself lives one level up in `../src` (Swift Package, "Project Swissknife").
This folder is **website only** — no app code.

Tagline: *"Remix files, not your privacy."*
Positioning: every conversion runs **locally on the Mac** — nothing is ever uploaded. No cloud, no AI, no tracking, no account. This privacy angle is the core differentiator vs. "free online converters" and must never be contradicted in copy.

## Stack & Deployment

- **Pure static HTML/CSS** — no framework, no build step for the core site, no runtime JS beyond `site-config.js`. Keep it that way (speed + SEO).
- **Hosting:** GitHub Pages, custom domain via `CNAME` (`privateremix.com`), `.nojekyll` present.
- **Deploy:** push to `main` → GitHub Pages serves it.
- Clean extensionless URLs work because each page is a folder with `index.html`.

## File Map

| Path | Purpose |
|---|---|
| `index.html` | Homepage — hero, how-it-works, privacy, conversion catalog, CTA |
| `privacy.html`, `support.html` | Static article pages |
| `convert/index.html` | **Generated** — hub linking all conversion pages |
| `convert-{in}-to-{out}-mac/index.html` | **Generated** — one SEO landing page per conversion |
| `styles.css` | Single shared stylesheet for the whole site |
| `site-config.js` | **Single source of truth for the App Store download URL** |
| `sitemap.xml` | **Generated** — all URLs |
| `robots.txt` | Allows all crawlers, points to sitemap |
| `tools/formats.mjs` | Conversion catalog + per-format knowledge base (source data) |
| `tools/generate.mjs` | Generator that emits all conversion pages + hub + sitemap |
| `assets/` | Icons, favicons |

## Conversion Landing Pages (Programmatic SEO)

URL pattern: `https://privateremix.com/convert-{origin}-to-{target}-mac`

**Never hand-edit `convert-*-mac/index.html`, `convert/index.html`, or `sitemap.xml`.**
They are generated. To change them, edit `tools/formats.mjs` (data/copy) or
`tools/generate.mjs` (template), then regenerate:

```bash
node tools/generate.mjs
```

The catalog in `tools/formats.mjs` **mirrors the app's authoritative list** in
`../src/Sources/ProjectSwissknifeCore/Catalogs.swift` (`ConversionCatalog.options`).
If the app adds/removes a conversion, update `CATALOG` here to match, then regenerate.

Each generated page includes (all required, don't regress):
- Unique "Why convert X to Y" copy (composed from format knowledge — not word-swaps, to avoid thin-content penalties)
- 5 format-specific FAQs
- `SoftwareApplication` + `FAQPage` + `BreadcrumbList` JSON-LD
- Self-referencing canonical, OG/Twitter tags
- "Related conversions" internal links (reverse + same-format + same-category)

## Download Link

Do **not** hardcode the App Store URL in pages. It lives once in `site-config.js`
(`APP_STORE_URL`). Every download button carries `data-download`; the script sets
their `href` on load. Currently a placeholder `idREPLACE_WITH_APP_ID` — replace with
the real numeric Mac App Store ID when live.

## Copy & Tone

- Calm, factual, privacy-first. macOS 14+, Apple silicon, free to try.
- Support email: `support@privateremix.com`.
- Don't invent features the app doesn't have — the conversion catalog is the source of truth.
