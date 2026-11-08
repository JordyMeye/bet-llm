import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Geist Mono -- the real monospace font getlyse.com uses (confirmed by
// reading its actual @font-face CSS, not guessed), self-hosted the same
// way Lyse serves it, just via Fontsource instead of next/font since this
// is a Vite app. Weights matched to what the app actually uses (400
// default, 500/600 for emphasis) -- see index.css for where --font-mono
// is wired to it.
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/500.css'
import '@fontsource/geist-mono/600.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
