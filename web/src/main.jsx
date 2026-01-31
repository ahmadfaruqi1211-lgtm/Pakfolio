import React from 'react'
import ReactDOM from 'react-dom/client'
import { jsPDF } from 'jspdf'
import App from './App'
import './styles.css'

if (typeof window !== 'undefined') {
  window.jspdf = { jsPDF }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js?v=3', { updateViaCache: 'none' })
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              window.location.reload()
            }
          })
        })
      })
      .catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
