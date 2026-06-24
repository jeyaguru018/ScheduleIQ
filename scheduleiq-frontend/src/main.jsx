import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ── v2.0 Theme Initialization ─────────────────────────────────────────────
// Apply the saved theme preference BEFORE React renders to prevent FOUC
// (Flash of Unstyled Content / wrong theme flash).
(function applyTheme() {
  const saved = localStorage.getItem('scheduleiq-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = saved ? saved === 'dark' : prefersDark;
  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
