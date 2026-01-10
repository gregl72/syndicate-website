// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  adapter: node({
    mode: 'standalone'
  }),
  site: 'https://syndicate.news',
  server: {
    port: 8080,
    host: '0.0.0.0'
  },
  security: {
    // Disable origin checking since we access via CloudFront URL
    // Re-enable once syndicate.news is configured
    checkOrigin: false
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
