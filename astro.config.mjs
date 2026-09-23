// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Canonical production origin. Override with SITE_URL for deploy previews if needed.
const site = process.env.SITE_URL || 'https://xus.co';

export default defineConfig({
  site,
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/404'),
    }),
  ],
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  vite: {
    build: {
      // three.js is intentionally split into its own chunk and only loaded by 3D islands.
      chunkSizeWarningLimit: 900,
    },
  },
});
