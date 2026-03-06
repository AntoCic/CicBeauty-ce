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
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  plugins: [
    vue(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectRegister: false,
      manifestFilename: 'site.webmanifest',
      injectManifest: {
        injectionPoint: undefined,
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
