// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname, // @ → src/*
      },
    },
  },
  // output: 'static', // по умолчанию SSG. Если нужно SSR — раскомментируйте и поставьте 'server'
});
