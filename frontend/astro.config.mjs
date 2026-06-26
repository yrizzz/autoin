// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // Prefetch halaman saat link di-hover → klik terasa instan.
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },

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