import './i18n/i18n';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Apply saved theme immediately (before React renders)
const savedTheme = localStorage.getItem('foodai-theme') || 'light';
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}
if (savedTheme === 'custom') {
  const css = localStorage.getItem('foodai-custom-css');
  if (css) {
    const el = document.createElement('style');
    el.id = 'foodai-custom-css';
    el.textContent = css;
    document.head.appendChild(el);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
