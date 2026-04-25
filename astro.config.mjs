// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://hutba.org',
  integrations: [
    tailwind(),
    // mdx(),
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 4321
  },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  },
  output: 'static',
  adapter: vercel(),
});