import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { QueryProvider } from './components/providers/QueryProvider'
import { PWAUpdater } from './components/PWAUpdater'
import { initSentry, initWebVitals, VercelObservability } from './lib/observability'
import { GlobalErrorBoundary } from './components/observability/GlobalErrorBoundary'
import './index.css'
import './design-system/tokens/primitives.css'
import './design-system/tokens/semantic.css'
import './design-system/tokens/components.css'
import './styles/manager-visual-scope.css'
import './styles/search-interactions.css'

initSentry()
initWebVitals()
document.documentElement.dataset.mxRuntime = 'universal-shell-v2'

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const key = 'mx-chunk-reload-at'
  const last = Number(sessionStorage.getItem(key) || 0)
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(key, String(Date.now()))
    window.location.reload()
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <QueryProvider>
        <App />
        <PWAUpdater />
        <VercelObservability />
      </QueryProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)
