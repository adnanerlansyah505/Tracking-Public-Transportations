import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  // The interface is designed light-only, so keep Nuxt UI surfaces light even
  // when the operating system prefers a dark theme.
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },

  pinia: {
    storesDirs: ['./app/stores/**', './stores/**'],
  },

  css: [
    'mapbox-gl/dist/mapbox-gl.css',
    '~/assets/css/main.css',
  ],

  devServer: {
    port: 4000,
  },

  runtimeConfig: {
    public: {
      appName: 'Public Transport Tracker',
      appUrl: 'http://localhost:4000',
      apiBaseUrl: 'http://localhost:3000/api/v1',
      mapboxToken: process.env.NUXT_PUBLIC_MAPBOX_TOKEN || process.env.MAPBOX_TOKEN || '',
    },
  },

  app: {
    head: {
      title: 'Real-Time Public Transport Tracking',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Live Angkot and public transportation tracking platform in Bandung' },
      ],
    },
  },

  vite: {
    plugins: [tailwindcss()],
    resolve: {
      tsconfigPaths: true,
    },
  },
});
