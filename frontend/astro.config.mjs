// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // SSR via Node standalone — dibutuhkan oleh proxy BFF (src/pages/api/[...path].ts)
  // dan middleware sesi (src/middleware.ts). Browser hanya bicara ke origin Astro;
  // server Astro yang meneruskan ke backend (lihat INTERNAL_API_URL).
  output: 'server',
  adapter: node({ mode: 'standalone' }),

  integrations: [react()],

  devToolbar: {
    enabled: false
  },

  server: {
    port: 4322,
    host: true,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: true,
    },
  }
});