import React from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n from './i18n';
import './index.css';
import { useAuthStore } from './stores/auth-store';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// Initialize authentication before React renders
// This ensures auth state is ready when components mount
console.log('Main: Starting authentication initialization...');
useAuthStore.getState().initialize();

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>
);