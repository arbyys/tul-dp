import { fileURLToPath, URL } from 'node:url'
import { createLogger, defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

const crossOriginHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

const logger = createLogger()
const originalWarn = logger.warn.bind(logger)
// suppress source map warnings
logger.warn = (msg, options) => {
  if (msg.includes('Failed to load source map')) return
  originalWarn(msg, options)
}

export default defineConfig({
  customLogger: logger,
  base: process.env.BASE_URL ?? '/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'pwa-icon.svg',
      ],
      manifest: {
        name: 'Výpůjčky',
        short_name: 'Výpůjčky',
        description:
          'Kolaborativní local-first aplikace pro evidenci výpůjček laboratorního vybavení.',
        lang: 'cs',
        theme_color: '#111111',
        background_color: '#111111',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // bundled SharedWorker script lives in /public — keep it out of precache
        // so the SW does not intercept its dedicated COOP/COEP fetch path
        globIgnores: ['**/quiet-bundle.js'],
        navigateFallbackDenylist: [/^\/quiet-bundle\.js$/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { headers: crossOriginHeaders },
  preview: { headers: crossOriginHeaders },
  worker: { format: 'es' },
})
