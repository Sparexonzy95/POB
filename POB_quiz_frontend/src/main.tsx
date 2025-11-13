import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import './celo-quiz-extensions.css'

// Add MiniPay detection and setup
if (typeof window !== 'undefined' && window.navigator.userAgent.includes('MiniPay')) {
  console.log('🔵 MiniPay environment detected - applying optimizations');
  
  // Add global flag for components to check
  (window as any).IS_MINIPAY = true;
  
  // Apply global cache-busting to fetch
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    // Add cache-busting for all requests
    if (typeof input === 'string' && input.includes('/api/')) {
      const url = new URL(input, window.location.origin);
      url.searchParams.append('_t', Date.now().toString());
      input = url.toString();
    }
    
    // Add cache-busting headers
    const newInit = {
      ...init,
      headers: {
        ...(init?.headers || {}),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      },
      cache: 'no-store'
    };
    
    return originalFetch(input, newInit);
  };
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)