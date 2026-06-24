import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),

    // ── v2.0: Progressive Web App ─────────────────────────────────────────
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'ScheduleIQ — AI Workforce Orchestration',
        short_name: 'ScheduleIQ',
        description: 'Intelligent shift scheduling, leave management, and workforce planning.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'My Schedule',
            short_name: 'Schedule',
            description: 'View your upcoming shifts',
            url: '/?page=employee_view',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache strategy: network-first for API calls, cache-first for assets
        runtimeCaching: [
          {
            // API: stale-while-revalidate with 5-min max age
            urlPattern: /^https:\/\/.*\/api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'scheduleiq-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300, // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Google Fonts — cache forever
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],

  server: {
    port: 5173,
    open: true,
    proxy: {
      // Proxy /api calls to Spring Boot in development
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
