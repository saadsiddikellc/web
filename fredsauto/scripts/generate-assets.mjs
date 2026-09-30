/**
 * Rasterises the brand mark and the social card with Playwright + Chromium.
 *
 *   node scripts/generate-assets.mjs
 *
 * Outputs (all committed, so the site itself needs no build step):
 *   assets/favicon-32.png        assets/favicon-16.png
 *   assets/apple-touch-icon.png  assets/og-image.png
 */
// Uses a globally installed Playwright; point PLAYWRIGHT_MODULE at it if needed.
// A CJS entry point arrives under `default`, a real ESM one as a named export.
const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium ?? pw.default?.chromium;
if (!chromium) throw new Error('Could not resolve Playwright. Set PLAYWRIGHT_MODULE.');
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '..', 'assets');

const INK = '#0b0c0d';
const GRAPHITE = '#8f959b';

/** The mark. One source of truth, shared by every icon size. */
const mark = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="${size}" height="${size}">
  <rect width="32" height="32" rx="7.5" fill="${INK}"/>
  <path d="M6.4 20.1h4.4L14.7 10.6l3.6 9.5h2.3" fill="none" stroke="#fff"
        stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="25" cy="20.1" r="2.3" fill="${GRAPHITE}"/>
</svg>`;

const iconPage = (size, pad = 0, bg = 'transparent') => `<!doctype html>
<meta charset="utf-8">
<style>
  html,body{margin:0;background:${bg}}
  body{width:${size}px;height:${size}px;display:grid;place-items:center}
  svg{display:block}
</style>
${mark(size - pad * 2)}`;

const ogPage = () => `<!doctype html>
<meta charset="utf-8">
<style>
  *{box-sizing:border-box}
  html,body{margin:0}
  body{
    width:1200px;height:630px;background:#fff;color:${INK};
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;
    position:relative;overflow:hidden;
  }
  .grid{
    position:absolute;inset:0;
    background-image:
      linear-gradient(to right,rgba(11,12,13,.09) 1px,transparent 1px),
      linear-gradient(to bottom,rgba(11,12,13,.09) 1px,transparent 1px);
    background-size:72px 72px;
    -webkit-mask-image:radial-gradient(115% 90% at 50% 12%,#000 20%,transparent 78%);
  }
  .circuit{position:absolute;inset:0;color:${GRAPHITE};opacity:.5}
  .inner{position:relative;padding:72px 80px;height:100%;display:flex;flex-direction:column}
  .brand{display:flex;align-items:center;gap:18px}
  .brand svg{border-radius:13px}
  .name{font-size:29px;font-weight:650;letter-spacing:.09em;line-height:1}
  .tag{
    margin-top:9px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${GRAPHITE};line-height:1;
  }
  h1{
    margin:auto 0 0;font-size:64px;font-weight:600;
    line-height:1.06;letter-spacing:-.032em;
  }
  .foot{
    margin-top:44px;padding-top:26px;border-top:1px solid rgba(11,12,13,.1);
    font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
    font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:#6e7378;
    display:flex;justify-content:space-between;gap:24px;
  }
  .foot b{font-weight:500;color:${GRAPHITE}}
</style>
<div class="grid"></div>
<svg class="circuit" viewBox="0 0 1200 630" preserveAspectRatio="none" fill="none"
     stroke="currentColor" stroke-width="1">
  <path d="M-20 140h240l48-48h260"/>
  <path d="M1220 470h-250l-52-52H700"/>
  <path d="M210 630V430l48-48V210"/>
  <path d="M980 0v120l-48 48v200"/>
</svg>
<div class="inner">
  <div class="brand">
    ${mark(56)}
    <div>
      <div class="name">FRED&rsquo;S AUTO</div>
      <div class="tag">Automotive Electrical Specialist</div>
    </div>
  </div>
  <h1>Complex Electrical Problems.<br>Diagnosed Properly.</h1>
  <div class="foot">
    <span>Advanced Diagnostics &middot; Fault Finding &middot; Pre-Purchase Inspections</span>
    <b>Demo Website</b>
  </div>
</div>`;

const shot = async (browser, html, width, height, out, omitBackground = false) => {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  const buffer = await page.screenshot({ omitBackground, type: 'png' });
  await writeFile(resolve(assets, out), buffer);
  await page.close();
  console.log('wrote assets/%s (%dx%d)', out, width, height);
};

const browser = await chromium.launch();
try {
  await mkdir(assets, { recursive: true });
  await shot(browser, iconPage(16), 16, 16, 'favicon-16.png', true);
  await shot(browser, iconPage(32), 32, 32, 'favicon-32.png', true);
  await shot(browser, iconPage(180, 16, '#fff'), 180, 180, 'apple-touch-icon.png');
  await shot(browser, ogPage(), 1200, 630, 'og-image.png');
} finally {
  await browser.close();
}
