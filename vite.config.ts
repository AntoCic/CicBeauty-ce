import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      manifestFilename: 'site.webmanifest',
      devOptions: { enabled: true, type: 'module' },
      injectRegister: false,
      includeAssets: [
        'img/logo/pwa.png',
        'img/logo/favicon.png',
        'img/logo/logo.png',
        'fonts/GoogleIcon/kJEhBvYX7BgnkSrUwT8OhrdQw4oELdPIeeII9v6oFsI.woff2',
        'fonts/Cal_Sans/CalSans-Regular.ttf',
        'fonts/Monoton/Monoton-Regular.ttf',
      ],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,woff,ttf,png,svg}'],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globIgnores: [],
      },
      manifest: {
        name: 'Cnc Beauty',
        short_name: 'Cnc Beauty',
        start_url: '/',
        display: 'fullscreen',
        background_color: '#F7F1F2',
        theme_color: '#F7F1F2',
        description: 'App del mio centro estetico di fiducia',
        icons: [
          { src: '/img/logo/pwa.png', sizes: '192x192', type: 'image/png' },
        ],

      }
    })
  ],
})
