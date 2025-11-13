// src/lib/api.ts - Enhanced with MiniPay optimizations and updated credit tracking

const BASE = '/api';  // Use relative URL path for proxy

// Detect MiniPay environment
const isMiniPay = typeof window !== 'undefined' && window.navigator.userAgent.includes('MiniPay');

// Credit tracking enhancements
const CREDITS_KEY = 'userCredits';
const PENDING_CREDITS_KEY = 'pendingCreditDeductions';

// Get locally stored credits (with pending deductions applied)
export function getLocalCredits(): number | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Get stored credits
    const storedCredits = localStorage.getItem(CREDITS_KEY);
    const storedValue = storedCredits ? parseInt(storedCredits, 10) : null;
    
    // Get pending deductions
    const pendingDeductions = getPendingCredits();
    
    // Apply pending deductions to stored value
    if (storedValue !== null) {
      return Math.max(0, storedValue - pendingDeductions);
    }
    
    return null;
  } catch (e) {
    console.error('Error reading local credits:', e);
    return null;
  }
}

// Store credits locally
export function storeLocalCredits(credits: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CREDITS_KEY, credits.toString());
    console.log('Stored local credits:', credits);
  } catch (e) {
    console.error('Error storing local credits:', e);
  }
}

// Get pending credit deductions
export function getPendingCredits(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    const pendingStr = localStorage.getItem(PENDING_CREDITS_KEY);
    return pendingStr ? parseInt(pendingStr, 10) : 0;
  } catch (e) {
    console.error('Error getting pending credits:', e);
    return 0;
  }
}

// Increase pending credit deductions
export function increasePendingCredits(): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getPendingCredits();
    localStorage.setItem(PENDING_CREDITS_KEY, (current + 1).toString());
    console.log('Increased pending credit deductions to:', current + 1);
  } catch (e) {
    console.error('Error increasing pending credits:', e);
  }
}

// Clear pending credit deductions (call after successful sync with server)
export function clearPendingCredits(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(PENDING_CREDITS_KEY);
    console.log('Cleared pending credit deductions');
  } catch (e) {
    console.error('Error clearing pending credits:', e);
  }
}

// Add timestamp parameter to bust cache
const addTimestamp = (url: string) => {
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_nocache=${timestamp}`;
};

// Configure fetch options based on environment
const getFetchOptions = (options: RequestInit = {}, additionalHeaders: Record<string, string> = {}): RequestInit => {
  const headers = {
    ...(options.headers || {}),
    ...additionalHeaders
  };

  if (isMiniPay) {
    // Apply aggressive cache-busting for MiniPay
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    headers['Pragma'] = 'no-cache';
    headers['X-MiniPay-Client'] = '1';
    
    return {
      ...options,
      headers,
      cache: 'no-store',
    };
  }
  
  return {
    ...options,
    headers,
  };
};

// Enhanced API calls with retry logic
async function enhancedFetch(url: string, options: RequestInit = {}, retryCount = 0): Promise<Response> {
  const maxRetries = isMiniPay ? 2 : 0; // Only retry in MiniPay by default
  const finalUrl = isMiniPay ? addTimestamp(url) : url;
  
  try {
    if (isMiniPay) {
      console.log(`API request (retry ${retryCount}): ${finalUrl}`);
    }
    
    const response = await fetch(finalUrl, options);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => `Status: ${response.status}`);
      throw new Error(errorText || `HTTP error: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    console.error(`API fetch error (${url}):`, error);
    
    if (retryCount < maxRetries) {
      // Exponential backoff for retries
      const delay = 1000 * Math.pow(2, retryCount);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return enhancedFetch(url, options, retryCount + 1);
    }
    
    throw error;
  }
}

export async function getState() {
  const response = await enhancedFetch(
    `${BASE}/quiz/state/`,
    getFetchOptions()
  );
  return response.json();
}

export async function getCredits(address: string) {
  // Special treatment for credit checking in MiniPay
  const fetchOptions = getFetchOptions(
    {
      method: 'GET',
    },
    { 'X-Addr': address }
  );
  
  try {
    const response = await enhancedFetch(
      `${BASE}/quiz/user/?address=${address}`, 
      fetchOptions
    );
    
    const data = await response.json();
    
    // Log the response in MiniPay for debugging
    if (isMiniPay) {
      console.log(`Credits response for ${address}:`, data);
    }
    
    // Store credits locally for faster access and offline credit tracking
    if (data && typeof data.credits === 'number') {
      storeLocalCredits(data.credits);
      
      // If we got a successful response, we can clear pending credits
      // as the server should now be in sync with our latest credit usage
      clearPendingCredits();
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching credits:', error);
    
    // If API call fails, use locally stored credits with pending deductions applied
    const localCredits = getLocalCredits();
    if (localCredits !== null) {
      console.log('Using locally stored credits:', localCredits);
      return { credits: localCredits };
    }
    
    // If we have no local data, rethrow the error
    throw error;
  }
}

// Enhanced version for post-transaction credit checking with better error handling and retries
export async function forceCheckCredits(address: string): Promise<number | null> {
  if (!address) return null;
  
  try {
    console.log(`Force checking credits for ${address}...`);
    
    // Try multiple times with increasing delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Add increasing delay between attempts
        if (attempt > 0) {
          const delay = 2000 * attempt;
          console.log(`Waiting ${delay}ms before attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        // Generate a unique timestamp to completely bypass any caching
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const url = `${BASE}/quiz/user/?address=${address}&_t=${timestamp}&_r=${random}`;
        
        const fetchOptions = getFetchOptions(
          { method: 'GET' },
          { 
            'X-Addr': address,
            'X-Force-Refresh': '1', // Special header to signal backend to bypass cache
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        );
        
        // Use a direct fetch to bypass any middleware
        const response = await fetch(url, fetchOptions);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Credit check attempt ${attempt + 1} succeeded:`, data);
        
        // Store the credit value for easy comparison
        if (typeof data.credits === 'number') {
          storeLocalCredits(data.credits);
          // Clear pending credits since we have fresh data from server
          clearPendingCredits();
          return data.credits;
        }
        
        return null;
      } catch (error) {
        console.error(`Credit check attempt ${attempt + 1} failed:`, error);
        // Continue to next attempt
      }
    }
    
    console.error("All force check credits attempts failed");
    
    // If API calls fail, use locally stored credits
    return getLocalCredits();
  } catch (error) {
    console.error("Force check credits failed:", error);
    return getLocalCredits();
  }
}

// Function to detect if credits have changed
export async function haveCreditsChanged(address: string): Promise<boolean> {
  if (!address) return false;
  
  try {
    // Get current stored value if available
    let lastValue: number | null = null;
    
    if (typeof window !== 'undefined') {
      try {
        const storedValue = localStorage.getItem(CREDITS_KEY);
        if (storedValue) {
          lastValue = parseInt(storedValue, 10);
        }
      } catch (e) {
        console.warn('Failed to retrieve credit data from localStorage:', e);
      }
    }
    
    // Force check current value
    const currentValue = await forceCheckCredits(address);
    
    // Compare
    if (lastValue !== null && currentValue !== null) {
      const changed = lastValue !== currentValue;
      console.log(`Credits check: Last=${lastValue}, Current=${currentValue}, Changed=${changed}`);
      return changed;
    }
    
    return false;
  } catch (error) {
    console.error("Error checking if credits changed:", error);
    return false;
  }
}

export async function startSession(address: string, count = 10) {
  // IMPORTANT FIX: Immediately increase pending credits when starting a session
  increasePendingCredits();
  
  const fetchOptions = getFetchOptions(
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    },
    { 'X-Addr': address }
  );
  
  try {
    const response = await enhancedFetch(
      `${BASE}/quiz/session/start/`, 
      fetchOptions
    );
    
    const sessionData = await response.json();
    
    // Register session in localStorage for credit tracking
    if (typeof window !== 'undefined' && sessionData && sessionData.sessionId) {
      try {
        // Store session with timestamp
        const sessions = JSON.parse(localStorage.getItem('quizSessions') || '{}');
        sessions[sessionData.sessionId] = {
          startTime: Date.now(),
          creditUsed: true, // Mark that this session used a credit
          completed: false
        };
        localStorage.setItem('quizSessions', JSON.stringify(sessions));
      } catch (e) {
        console.error('Error storing session data:', e);
      }
    }
    
    return sessionData;
  } catch (error) {
    console.error('Error starting session:', error);
    
    // If the session fails to start, we should rollback the pending credit
    // This prevents users from losing credits for failed session starts
    if (getPendingCredits() > 0) {
      const current = getPendingCredits();
      localStorage.setItem(PENDING_CREDITS_KEY, Math.max(0, current - 1).toString());
    }
    
    throw error;
  }
}

export async function submitAnswers(address: string, sessionId: number, answers: {questionId:number, optionId:number}[]) {
  const fetchOptions = getFetchOptions(
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, answers }),
    },
    { 'X-Addr': address }
  );
  
  const response = await enhancedFetch(
    `${BASE}/quiz/session/answer/`, 
    fetchOptions
  );
  
  return response.json();
}

export async function finish(address: string, sessionId: number) {
  const fetchOptions = getFetchOptions(
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    },
    { 'X-Addr': address }
  );
  
  try {
    const response = await enhancedFetch(
      `${BASE}/quiz/session/finish/`, 
      fetchOptions
    );
    
    const result = await response.json();
    
    // Mark session as completed in localStorage
    if (typeof window !== 'undefined') {
      try {
        // Update session data
        const sessions = JSON.parse(localStorage.getItem('quizSessions') || '{}');
        if (sessions[sessionId]) {
          sessions[sessionId].completed = true;
          sessions[sessionId].finishTime = Date.now();
          sessions[sessionId].result = {
            passed: result.passed,
            correct: result.correct,
            total: result.total
          };
          localStorage.setItem('quizSessions', JSON.stringify(sessions));
        }
        
        // Store the sessionId for tracking settlement
        localStorage.setItem('lastFinishedSession', String(sessionId));
        localStorage.setItem('lastFinishTime', String(Date.now()));
      } catch (e) {
        console.warn('Failed to store session data:', e);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error finishing session:', error);
    
    // We don't rollback the pending credit here because the credit 
    // should have been used when the session was started, even if finish fails
    
    throw error;
  }
}

export async function status(address: string, sessionId: number) {
  const fetchOptions = getFetchOptions(
    {
      method: 'GET',
    },
    { 'X-Addr': address }
  );
  
  const response = await enhancedFetch(
    `${BASE}/quiz/session/status/${sessionId}/`, 
    fetchOptions
  );
  
  return response.json();
}

// Check settlement status explicitly
export async function checkSettlement(address: string, sessionId: number) {
  if (!address || !sessionId) return null;
  
  try {
    const url = `${BASE}/settlement/status/?session=${sessionId}&addr=${address}`;
    const fetchOptions = getFetchOptions(
      { method: 'GET' },
      { 'X-Addr': address }
    );
    
    const response = await enhancedFetch(url, fetchOptions);
    return response.json();
  } catch (error) {
    console.error("Error checking settlement status:", error);
    return null;
  }
}

// Helper function to clear all cached data
export function clearApiCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('lastCreditCheck');
    localStorage.removeItem('lastCreditValue');
    localStorage.removeItem('lastFinishedSession');
    localStorage.removeItem('lastFinishTime');
    localStorage.removeItem('lastRefresh');
    console.log('API cache cleared');
  }
}

// Function to poll settlement status until complete
export async function pollUntilSettled(address: string, sessionId: number, maxAttempts = 10, callback?: (settlement: any) => void) {
  if (!address || !sessionId) return false;
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const settlement = await checkSettlement(address, sessionId);
      
      if (settlement && settlement.tx_hash) {
        console.log(`Settlement complete for session ${sessionId}:`, settlement);
        if (callback) callback(settlement);
        return true;
      }
      
      // Wait with increasing delays between attempts
      const delay = Math.min(2000 * Math.pow(1.5, attempts - 1), 10000);
      console.log(`No settlement yet for session ${sessionId}. Retrying in ${delay}ms (attempt ${attempts}/${maxAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`Settlement check attempt ${attempts} failed:`, error);
      
      // Brief pause before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.warn(`Settlement polling timed out after ${maxAttempts} attempts for session ${sessionId}`);
  return false;
}