import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL wird beim Deployment gesetzt; Fallback für lokale Builds.
export default defineConfig({
  site: process.env.SITE_URL || 'https://doener-demo-koeln.vercel.app',
  integrations: [sitemap()],
});
