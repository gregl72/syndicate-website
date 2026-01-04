// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  site: 'https://syndicate.news', // Update with actual domain
  vite: {
    plugins: [tailwindcss()]
  }
});
