import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Makes the app installable (Chrome "Install", Android "Add to Home screen")
    // and usable offline: every built file is precached by the service worker.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // registered from src/shell/install.ts
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'Plotline Calculator',
        short_name: 'Plotline',
        description: 'Graphing, scientific, four-function and matrix calculators. Works offline.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f4fb',
        theme_color: '#ffffff',
        categories: ['education', 'productivity', 'utilities'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Graphing', url: '/#/graphing', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Scientific', url: '/#/scientific', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Four Function', url: '/#/four-function', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
          { name: 'Matrix', url: '/#/matrix', icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Font stylesheet: refresh in the background.
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            // Font files never change for a given URL.
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
