import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  root: 'web',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: '../js', dest: '' },
        { src: '../css', dest: '' },
        { src: '../icons', dest: '' },
        { src: '../manifest.json', dest: '' },
        { src: '../browserconfig.xml', dest: '' },
        { src: '../pwa-192x192.png', dest: '' },
        { src: '../pwa-512x512.png', dest: '' }
      ]
    })
  ],
  build: {
    outDir: '../mobile',
    emptyOutDir: true
  }
})
