// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://hutba.org',
  integrations: [react(), tailwind()],
    server: {
    host: true, // или '0.0.0.0' - позволяет подключиться с телефона
    port: 4321
  },
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname, // @ → src/*
      },
    },
  },
  output: 'static', // по умолчанию SSG. Если нужно SSR — раскомментируйте и поставьте 'server'
});
