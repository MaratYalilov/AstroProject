// astro.config.mjs
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://hutba.org',
  integrations: [
    // Диаграммы Mermaid: ```mermaid в .md-уроках обрабатывает сама интеграция,
    // а в теории уроков (raw Markdown → marked) — src/utils/mermaid.ts.
    // autoTheme переключает тему диаграмм по data-theme на <html>.
    mermaid({
      autoTheme: true,
      enableLog: false,
      mermaidConfig: {
        startOnLoad: false,
        securityLevel: 'strict',
        // 18px вместо дефолтных 16px — как основной текст теории.
        themeVariables: { fontSize: '18px' },
        // Натуральный размер вместо width="100%": иначе браузер ужимает всю
        // схему под ширину колонки и текст становится нечитаемым.
        flowchart: { useMaxWidth: false },
      },
    }),
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
