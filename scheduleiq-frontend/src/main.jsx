import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ToastProvider } from './components/common/Toast.jsx'

// ── v2.0 Theme Initialization ─────────────────────────────────────────────
// Apply the saved theme preference BEFORE React renders to prevent FOUC
// (Flash of Unstyled Content / wrong theme flash).
(function applyTheme() {
  try {
    const saved = localStorage.getItem('scheduleiq-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved ? saved === 'dark' : prefersDark;
    if (shouldBeDark) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    console.warn('Failed to access localStorage for theme preference:', e);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>,
)
