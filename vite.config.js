import { defineConfig } from 'vite'

export default defineConfig({
  // Use current directory as root
  root: '.',
  // simple static file serving
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
})
