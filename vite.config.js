import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  // Use current directory as root
  root: '.',
  // simple static file serving
  publicDir: 'public',
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'js', dest: '' },
        { src: 'css', dest: '' },
        { src: 'icons', dest: '' },
        { src: 'manifest.json', dest: '' },
        { src: 'browserconfig.xml', dest: '' },
        { src: 'pwa-192x192.png', dest: '' },
        { src: 'pwa-512x512.png', dest: '' }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
