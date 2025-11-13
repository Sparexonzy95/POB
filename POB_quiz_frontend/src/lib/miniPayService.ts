// src/lib/miniPayService.ts
// Specialized utilities for dealing with MiniPay-specific issues

/**
 * Specialized API service for MiniPay environment
 * Handles caching and retry issues specific to the mobile wallet browser
 */

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

// Helper for creating timestamped URLs to bust cache
const getTimestampedUrl = (url: string) => {
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${timestamp}`;
};

// Special fetch wrapper that handles MiniPay quirks
async function miniPayFetch(url: string, options: RequestInit = {}, retries = 3, delay = 2000): Promise<Response> {
  // Add cache-busting headers
  const headers = {
    ...options.headers,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'X-MiniPay-Client': '1', // Special header to identify MiniPay requests on server
  };

  // Add cache: 'no-store' for MiniPay 
  const fetchOptions = {
    ...options,
    headers,
    cache: 'no-store' as RequestCache,
  };

  try {
    console.log(`MiniPay fetch attempt for: ${url}`);
    const response = await fetch(getTimestampedUrl(url), fetchOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error(`MiniPay fetch error:`, error);
    
    if (retries <= 0) {
      throw error;
    }
    
    console.log(`Retrying in ${delay}ms... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return miniPayFetch(url, options, retries - 1, delay * 1.5);
  }
}

/**
 * Get credits with MiniPay optimizations
 * Multiple retry attempts with increasing delays
 */
export async function getMiniPayCredits(address: string): Promise<number> {
  // Force-bust any potential cache with timestamp
  const url = `${BASE}/credits/${address}/`;
  
  console.log(`Checking MiniPay credits for: ${address}`);
  
  const response = await miniPayFetch(url, {
    headers: { 'X-Addr': address },
  });

  const data = await response.json();
  console.log(`MiniPay credits response:`, data);
  
  return data.credits;
}

/**
 * Specialized post-transaction credit refresh
 * Uses an escalating retry strategy with delays
 */
export async function forceRefreshCredits(address: string): Promise<number | null> {
  console.log(`Force refreshing MiniPay credits for: ${address}`);
  
  // Try multiple times with increasing delays
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Wait longer with each attempt
      const delay = 2000 * attempt;
      console.log(`Waiting ${delay}ms before attempt ${attempt}...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const credits = await getMiniPayCredits(address);
      console.log(`Credits check attempt ${attempt} succeeded: ${credits}`);
      return credits;
    } catch (error) {
      console.error(`Credits check attempt ${attempt} failed:`, error);
    }
  }
  
  // All attempts failed
  console.error("All credit refresh attempts failed");
  return null;
}

/**
 * Special utility for transaction tracking
 * Creates a helper to monitor transaction status
 */
export function createTxTracker(txHash: string) {
  return {
    txHash,
    status: 'pending',
    lastChecked: Date.now(),
    // Additional methods can be added for checking tx status
  };
}

/**
 * Clear all localStorage cache keys
 * Can be called when things get stuck
 */
export function clearMiniPayCache() {
  // Clear any cached timestamps
  localStorage.removeItem('lastCreditCheck');
  localStorage.removeItem('lastTxCheck');
  localStorage.removeItem('lastRefresh');
  // Add any other cache keys that might be problematic
  
  console.log('Cleared MiniPay cache');
}