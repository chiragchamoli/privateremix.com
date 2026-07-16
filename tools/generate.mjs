// Static page generator for PrivateRemix conversion landing pages.
//   node tools/generate.mjs
// Emits one folder per conversion (clean URL /convert-{in}-to-{out}-mac),
// a /convert hub page, and a regenerated sitemap.xml.
import { FORMATS, CATALOG } from "./formats.mjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://privateremix.com";
const CAT_LABEL = { image: "Images", video: "Video", audio: "Audio" };

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = (i, o) => `convert-${i}-to-${o}-mac`;
const fmt = (ext) => {
  const known = FORMATS[ext];
  if (!known) throw new Error(`Unknown format in CATALOG: ${ext}`);
  return known;
};

function qualityFaq(inp, out) {
  const q = `Will I lose quality converting ${inp.name} to ${out.name}?`;
  let a;
  if (out.lossy === false) {
    a = `No. ${out.name} is a lossless format, so no image or audio detail is discarded in the conversion.`;
  } else if (out.lossy === true && inp.lossy === false) {
    a = `${out.name} is a compressed format, so there is a small, usually imperceptible quality trade-off in exchange for a much smaller file. PrivateRemix lets you pick the balance — Smaller file, Balanced, or Best quality.`;
  } else if (out.lossy === true) {
    a = `The change is minimal. Both formats are compressed, and you choose the size-versus-quality balance — Smaller file, Balanced, or Best quality — so everyday use shows no visible or audible drop.`;
  } else {
    a = `PrivateRemix preserves your content faithfully during the conversion. Text, images and layout are carried across as cleanly as the formats allow.`;
  }
  return { q, a };
}

function buildFaqs(inp, out) {
  const faqs = [qualityFaq(inp, out)];
  if (inp.faq) faqs.push(inp.faq);
  if (out.faq && (!inp.faq || out.faq.q !== inp.faq.q)) faqs.push(out.faq);
  faqs.push({
    q: `Do my files get uploaded when I convert ${inp.name} to ${out.name}?`,
    a: `No. PrivateRemix runs entirely on your Mac using its own processor. Your ${inp.name} files never leave the device — there is no server to upload to, and it works fully offline.`,
  });
  faqs.push({
    q: `Can I convert several ${inp.name} files to ${out.name} at once?`,
    a: `Yes. Drop in a batch of ${inp.name} files and PrivateRemix converts them all locally, saving each new ${out.name} next to its original.`,
  });
  return faqs.slice(0, 5);
}

function related(inp, out) {
  const out2 = [];
  // Reverse conversion, if it exists in the catalog.
  const rev = CATALOG.find(([i, o]) => i === out.key && o === inp.key);
  if (rev) out2.push(rev);
  // Same origin format, different target.
  for (const c of CATALOG) if (c[0] === inp.key && c[1] !== out.key) out2.push(c);
  // Same category, different pair.
  for (const c of CATALOG) {
    if (out2.length >= 6) break;
    if (c[0] === inp.key) continue;
    if (fmt(c[0]).kind === inp.kind && !out2.some((x) => x[0] === c[0] && x[1] === c[1])) out2.push(c);
  }
  return out2.slice(0, 6);
}

const navHtml = `
  <nav class="nav">
    <div class="wrap">
      <a class="brand" href="/index.html">
        <img src="/assets/app-icon-1024.png" alt="PrivateRemix">
        PrivateRemix
      </a>
      <div class="nav-links">
        <a href="/convert" class="hide-sm">Conversions</a>
        <a href="/privacy.html">Privacy</a>
        <a href="/support.html">Support</a>
        <a href="#download" class="btn btn-green btn-sm nav-cta" data-download>Download</a>
      </div>
    </div>
  </nav>`;

const footerHtml = `
  <footer class="footer">
    <div class="wrap">
      <a class="brand" href="/index.html">
        <img src="/assets/app-icon-1024.png" alt="PrivateRemix">
        PrivateRemix
      </a>
      <div class="f-links">
        <a href="/privacy.html">Privacy</a>
        <a href="/support.html">Support</a>
        <a href="/convert">Conversions</a>
      </div>
      <div class="spacer"></div>
      <a class="email" href="mailto:support@privateremix.com">support@privateremix.com</a>
      <div class="copy">© 2026 PrivateRemix. Remix files, not your privacy.</div>
    </div>
  </footer>
  <script src="/site-config.js"></script>`;

function page(inp, out, reason) {
  const url = `${ORIGIN}/${slug(inp.key, out.key)}`;
  const title = `Convert ${inp.name} to ${out.name} on Mac — Free & Private | PrivateRemix`;
  const desc = `Convert ${inp.name} to ${out.name} on your Mac, free. ${reason} Every conversion is 100% local — nothing is uploaded. No cloud, no tracking.`;
  const h1 = `Convert ${inp.name} to ${out.name} on Mac`;
  const faqs = buildFaqs(inp, out);
  const rel = related(inp, out);

  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const appLd = {
    "@context": "https://schema.org", "@type": "SoftwareApplication",
    name: "PrivateRemix", applicationCategory: "UtilitiesApplication", operatingSystem: "macOS 14",
    description: `PrivateRemix converts ${inp.name} to ${out.name} and 40+ other formats entirely on your Mac. Nothing is ever uploaded.`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    url, image: `${ORIGIN}/assets/app-icon-1024.png`,
  };
  const crumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Conversions", item: `${ORIGIN}/convert` },
      { "@type": "ListItem", position: 3, name: `${inp.name} to ${out.name}`, item: url },
    ],
  };

  const faqHtml = faqs.map((f) => `
        <div class="faq-item">
          <h3>${esc(f.q)}</h3>
          <p>${esc(f.a)}</p>
        </div>`).join("");

  const relHtml = rel.map(([i, o]) => {
    const fi = fmt(i), fo = fmt(o);
    return `<a class="conv" href="/${slug(i, o)}"><div class="pair">${fi.name} <span class="arrow">→</span> ${fo.name}</div></a>`;
  }).join("\n          ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ORIGIN}/assets/app-icon-1024.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(appLd)}</script>
  <script type="application/ld+json">${JSON.stringify(faqLd)}</script>
  <script type="application/ld+json">${JSON.stringify(crumbLd)}</script>
</head>
<body>
${navHtml}

  <header class="hero">
    <div class="wrap">
      <span class="kicker">${esc(CAT_LABEL[inp.kind] || "Convert")} · On-device</span>
      <h1>${esc(h1)}</h1>
      <p class="lede">${esc(reason)} Every conversion runs locally on your Mac — your ${inp.name} files are never uploaded.</p>
      <div class="cta-row" id="download">
        <a class="btn btn-green" href="#" data-download>Download on the Mac App Store</a>
        <a class="btn btn-ghost" href="/convert">See all conversions</a>
      </div>
      <p class="note">macOS 14 or later · Apple silicon · Free to try</p>
    </div>
  </header>

  <section class="section">
    <div class="wrap">
      <span class="kicker">Why convert ${inp.name} to ${out.name}?</span>
      <h2>From ${inp.full} to ${out.full}.</h2>
      <p class="sub">${inp.name} is ${inp.what}. ${out.name} is ${out.what}. ${esc(reason)}</p>
      <div class="promises">
        <div class="promise">
          <div class="h"><span class="dot"></span> ${esc(reason)}</div>
          <p>PrivateRemix handles the ${inp.name}-to-${out.name} conversion in a couple of clicks, with the result saved right next to your original file.</p>
        </div>
        <div class="promise">
          <div class="h"><span class="dot"></span> 100% private</div>
          <p>Unlike free online converters, PrivateRemix has no server. Your ${inp.name} files stay on your Mac — no upload, no cloud, no account.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <span class="kicker">How it works</span>
      <h2>Three steps. Zero uploads.</h2>
      <div class="steps">
        <div class="step"><div class="num">1</div><h3>Drop your ${inp.name}</h3><p>Drag a ${inp.name} file into PrivateRemix, or pick one from your Mac.</p></div>
        <div class="step"><div class="num">2</div><h3>Choose ${out.name}</h3><p>Select ${out.name} from the formats PrivateRemix offers for your file.</p></div>
        <div class="step"><div class="num">3</div><h3>Convert locally</h3><p>The new ${out.name} appears next to the original. Nothing leaves your Mac.</p></div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <span class="kicker">FAQ</span>
      <h2>${inp.name} to ${out.name}, answered.</h2>
      <div class="faq">${faqHtml}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <span class="kicker">Related conversions</span>
      <h2>More ways to remix.</h2>
      <div class="conv-grid">
          ${relHtml}
      </div>
    </div>
  </section>

  <section class="band">
    <h2>Convert ${inp.name} to ${out.name} now</h2>
    <p>Free to try. macOS 14 or later, Apple silicon.</p>
    <div class="cta-row">
      <a class="btn btn-amber" href="#" data-download>Download on the Mac App Store</a>
    </div>
  </section>
${footerHtml}
</body>
</html>
`;
}

function hubPage() {
  const byCat = { image: [], video: [], audio: [] };
  for (const [i, o, r] of CATALOG) byCat[fmt(i).kind].push([i, o, r]);
  const sections = Object.entries(byCat).map(([cat, items]) => {
    const cards = items.map(([i, o, r]) => {
      const fi = fmt(i), fo = fmt(o);
      return `<a class="conv" href="/${slug(i, o)}"><div class="pair">${fi.name} <span class="arrow">→</span> ${fo.name}</div><div class="why">${esc(r)}</div></a>`;
    }).join("\n          ");
    return `
      <div class="cat">
        <h3>${CAT_LABEL[cat]}</h3>
        <div class="conv-grid">
          ${cards}
        </div>
      </div>`;
  }).join("\n");
  const title = "All File Conversions for Mac — Free & Private | PrivateRemix";
  const desc = `Every file conversion PrivateRemix supports on Mac — ${CATALOG.length} image, video and audio conversions, all 100% local. Nothing is ever uploaded.`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${ORIGIN}/convert">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${ORIGIN}/convert">
  <meta property="og:image" content="${ORIGIN}/assets/app-icon-1024.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
${navHtml}
  <header class="hero">
    <div class="wrap">
      <span class="kicker">The catalog</span>
      <h1>Every conversion PrivateRemix does</h1>
      <p class="lede">${CATALOG.length} conversions across images, video and audio — every one runs locally on your Mac.</p>
      <div class="cta-row" id="download">
        <a class="btn btn-green" href="#" data-download>Download on the Mac App Store</a>
      </div>
    </div>
  </header>
  <section class="section">
    <div class="wrap">${sections}
    </div>
  </section>
${footerHtml}
</body>
</html>
`;
}

// ---- write everything ----
let count = 0;
const urls = [`${ORIGIN}/`, `${ORIGIN}/convert`, `${ORIGIN}/privacy.html`, `${ORIGIN}/support.html`];
for (const [i, o, r] of CATALOG) {
  const inp = { ...fmt(i), key: i };
  const out = { ...fmt(o), key: o };
  const dir = join(ROOT, slug(i, o));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), page(inp, out, r));
  urls.push(`${ORIGIN}/${slug(i, o)}`);
  count++;
}
mkdirSync(join(ROOT, "convert"), { recursive: true });
writeFileSync(join(ROOT, "convert", "index.html"), hubPage());

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><priority>${u === ORIGIN + "/" ? "1.0" : u.includes("convert-") ? "0.7" : "0.6"}</priority></url>`).join("\n")}
</urlset>
`;
writeFileSync(join(ROOT, "sitemap.xml"), sitemap);
console.log(`Generated ${count} conversion pages + hub + sitemap (${urls.length} URLs).`);
