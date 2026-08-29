import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@pinia/nuxt'],

  pinia: {
    storesDirs: ['./stores/**'],
  },

  css: ['~/assets/css/main.css'],

  devServer: {
    port: 4000
  },

  runtimeConfig: {
    public: {
      appName: 'Public Transport Tracker',
      appUrl: 'http://localhost:4000',
      apiBaseUrl: 'http://localhost:3000/api/v1',
    },
  },

  app: {
    head: {
      title: 'Public Transport Tracker',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Public transportation tracking platform' },
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
