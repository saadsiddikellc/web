/**
 * Generates raster brand assets (OG image, touch icons, favicon.ico) from HTML/SVG
 * using the local Chromium. Run: node scripts/generate-assets.mjs
 * Output is committed to /public, so this only needs re-running when branding changes.
 */
// Uses a globally installed Playwright; point PLAYWRIGHT_MODULE at it if needed.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { readFileSync, writeFileSync } from 'node:fs';

const fav = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(html, w, h, out) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
}

const icon = (size) => `<html><body style="margin:0">${fav.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`;
await shot(icon(512), 512, 512, 'public/icons/xus-512.png');
await shot(icon(192), 192, 192, 'public/icons/xus-192.png');
await shot(icon(180), 180, 180, 'public/icons/apple-touch-icon.png');
await shot(icon(32), 32, 32, 'public/icons/favicon-32.png');

const og = `<!doctype html><html><head><style>
  body{margin:0;width:1200px;height:630px;background:#f2f1ed;font-family:Inter,Helvetica,Arial,sans-serif;color:#0c0c0d;position:relative;overflow:hidden}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(12,12,13,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(12,12,13,.06) 1px,transparent 1px);background-size:60px 60px}
  .t{position:absolute;left:72px;bottom:120px;font-size:112px;font-weight:600;letter-spacing:-6px;line-height:.9}
  .e{position:absolute;left:76px;top:64px;font:500 18px/1 monospace;letter-spacing:3px;text-transform:uppercase;color:#5c5d61}
  .e b{display:inline-block;width:9px;height:9px;border-radius:50%;background:#2450ff;margin-right:12px}
  .d{position:absolute;left:76px;bottom:64px;font:400 26px/1.3 Helvetica,Arial;color:#3a3a3d}
  .x{position:absolute;right:72px;top:56px;width:120px}
  svg.l{position:absolute;right:120px;bottom:210px}
</style></head><body><div class="grid"></div>
<div class="e"><b></b>AI agents · AI automation</div>
<div class="x">${fav}</div>
<div class="t">Work that<br>keeps working.</div>
<div class="d">Autonomous AI workflows for leads, follow-ups, scheduling and renewals.</div>
<svg class="l" width="260" height="120" viewBox="0 0 260 120" fill="none"><path d="M4 100c60-60 140-90 240-80" stroke="#2450ff" stroke-width="2.5" stroke-linecap="round"/><path d="M226 6l20 14-18 16" stroke="#2450ff" stroke-width="2.5" stroke-linecap="round"/></svg>
</body></html>`;
await shot(og, 1200, 630, 'public/og/xus-og.png');
await browser.close();

// favicon.ico: a PNG-in-ICO container (supported by all modern browsers).
const png = readFileSync('public/icons/favicon-32.png');
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6);
header.writeUInt8(32, 7);
header.writeUInt8(0, 8);
header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14);
header.writeUInt32LE(22, 18);
writeFileSync('public/favicon.ico', Buffer.concat([header, png]));
console.log('assets generated');
