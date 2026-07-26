import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.bleufoot.com',
  output: 'static',
  trailingSlash: 'never',
  compressHTML: true,
  integrations: [sitemap()],
});