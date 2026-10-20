import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  site: process.env.SITE_URL || 'https://awesome.pawel.in',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { plugins: [tailwindcss()], build: { cssMinify: true } },
});
