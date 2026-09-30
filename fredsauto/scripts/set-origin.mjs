/**
 * Stamps the live origin into every absolute URL on the site.
 *
 *   node scripts/set-origin.mjs https://fredsauto.netlify.app
 *
 * Netlify hands you the domain only after the first deploy, so the files ship
 * with a loud YOUR-SITE placeholder. Run this once, then redeploy.
 * Safe to re-run: it rewrites whatever origin is currently in place.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html'];

const raw = process.argv[2];
if (!raw) {
  console.error('Usage: node scripts/set-origin.mjs https://your-site.netlify.app');
  process.exit(1);
}

let origin;
try {
  const url = new URL(raw);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('bad protocol');
  origin = url.origin;
} catch {
  console.error(`Not a valid origin: ${raw}`);
  console.error('Expected something like https://fredsauto.netlify.app');
  process.exit(1);
}

/* Matches the placeholder and any origin a previous run left behind. */
const ORIGIN = /https?:\/\/[^/"'<>\s]+/g;

/* Rewrite only the three tags that benefit from an absolute URL. A blanket
   replace would corrupt things that merely look like URLs but are identifiers --
   the schema.org "@context" is a namespace, not a link. */
const TARGETS = {
  'index.html': [
    /(<link rel="canonical" href=")([^"]*)/,
    /(<meta property="og:url" content=")([^"]*)/,
    /(<meta property="og:image" content=")([^"]*)/,
  ],
};

/* Keep the existing path, re-anchor it to the new origin. Works whether the
   value is currently relative ("assets/og-image.png") or already absolute. */
const stamp = (value) => {
  const path = value.replace(ORIGIN, '');
  return origin + (path.startsWith('/') ? path : '/' + path);
};

let changed = 0;

for (const name of files) {
  const path = resolve(root, name);
  const before = await readFile(path, 'utf8');
  let after = before;

  for (const re of TARGETS[name]) {
    after = after.replace(re, (m, head, value) => head + stamp(value));
  }

  if (after !== before) {
    await writeFile(path, after);
    changed += 1;
    console.log(`updated ${name}`);
  } else {
    console.log(`unchanged ${name}`);
  }
}

console.log(`\nOrigin set to ${origin} (${changed} file${changed === 1 ? '' : 's'} changed). Redeploy to publish.`);
