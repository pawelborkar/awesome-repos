import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  site: process.env.SITE_URL || 'https://awesome.pawel.in',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: {
    envDir: fileURLToPath(new URL('../', import.meta.url)),
    plugins: [tailwindcss()],
    build: { cssMinify: true }
  },
});
