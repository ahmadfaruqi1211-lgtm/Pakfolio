self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const CACHE_NAME = `pakfolio-cache-v3`
      const cache = await caches.open(CACHE_NAME)

      const core = [
        '/',
        '/index.html',
        '/manifest.json',
        '/sw.js',
        '/pwa-192x192.png',
        '/pwa-512x512.png',
        '/icons/favicon.svg',
        '/js/fifo-engine.js',
        '/js/tax-calculator.js',
        '/js/storage-manager.js',
        '/js/what-if-scenarios.js',
        '/js/pdf-generator.js',
        '/js/corporate-actions.js'
      ]

      try {
        await cache.addAll(core)
      } catch {}

      try {
        const res = await fetch('/index.html', { cache: 'no-cache' })
        const html = await res.text()
        const matches = html.match(/\/(assets\/[^"']+)/g) || []
        const assets = Array.from(new Set(matches))
        if (assets.length) {
          await cache.addAll(assets)
        }
      } catch {}

      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set(['pakfolio-cache-v3'])
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => (keep.has(k) ? Promise.resolve() : caches.delete(k))))
      await self.clients.claim()

      try {
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const client of clients) {
          client.postMessage({ type: 'SW_UPDATED' })
        }
      } catch {}
    })()
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  const cacheName = 'pakfolio-cache-v3'

  const isNavigate = req.mode === 'navigate'
  const isAsset = url.pathname.startsWith('/assets/')

  if (isNavigate) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(cacheName)
          cache.put('/index.html', fresh.clone())
          return fresh
        } catch {
          const cached = await caches.match('/index.html')
          return cached || Response.error()
        }
      })()
    )
    return
  }

  if (isAsset || url.pathname.startsWith('/js/') || url.pathname.startsWith('/icons/') || url.pathname.endsWith('.css')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        try {
          const fresh = await fetch(req)
          const cache = await caches.open(cacheName)
          cache.put(req, fresh.clone())
          return fresh
        } catch {
          return Response.error()
        }
      })()
    )
  }
})
