import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // include these files in the service worker precache
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],

      // ── Web App Manifest ────────────────────────────────────────────────
      manifest: {
        name: 'VideoTube — Watch, Upload & Share Videos',
        short_name: 'VideoTube',
        description: 'A YouTube-like video streaming platform. Watch, like, comment, and manage playlists.',
        theme_color: '#7c3aed',
        background_color: '#0c0c10',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['entertainment', 'social'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable', // for adaptive icons on Android
          },
        ],
      },

      // ── Workbox Service Worker Config ────────────────────────────────────
      workbox: {
        // Precache all Vite-built assets (JS, CSS, HTML)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],

        runtimeCaching: [
          // ── API calls: Network First (always try fresh, fall back to cache) ──
          {
            urlPattern: /\/api\/v1\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              networkTimeoutSeconds: 10,
            },
          },

          // ── YouTube thumbnails & images: Cache First (fast loading) ────────
          {
            urlPattern: /^https:\/\/i\.ytimg\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'youtube-thumbnails',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Google Fonts: Cache First ─────────────────────────────────────
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },

          // ── Cloudinary images: Stale While Revalidate ─────────────────────
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      devOptions: {
        // Enable service worker in dev mode for testing
        enabled: false,
      },
    }),
  ],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        credentials: true,
      },
    },
  },
})
