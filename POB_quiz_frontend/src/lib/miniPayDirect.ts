// src/lib/miniPayDirect.ts
// A direct implementation for MiniPay that avoids libraries causing issues

// Constants - these should match your contract values
export const QUIZ_ADDRESS = (import.meta.env.VITE_QUIZ_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000';
export const CUSD_ADDRESS = '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b'; // cUSD token on Celo Sepolia

// Function signatures (from Solidity selectors)
const APPROVE_SELECTOR = '0x095ea7b3'; // approve(address,uint256)
const PAY_FEE_SELECTOR = '0xbe85533d'; // payEntryFee()

/**
 * Direct payment implementation for MiniPay
 * Uses raw ethereum calls with no library dependencies
 */
export async function miniPayDirectPayment(address: string): Promise<{success: boolean, txHash?: string}> {
  console.log('Using direct MiniPay implementation for:', address);
  
  // Get the ethereum provider
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('MiniPay wallet not available');
  
  // Check network - handle both uppercase and lowercase hex
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  const normalizedChainId = typeof chainId === 'string' ? chainId.toLowerCase() : chainId;
  
  if (normalizedChainId !== '0xaa044c' && chainId !== '11142220' && parseInt(chainId, 16) !== 11142220) {
    throw new Error('Please switch to Celo Sepolia Testnet in MiniPay');
  }
  
  // Set up a large approval amount (for future transactions)
  // Use a fixed large amount to avoid decimal conversion issues - 10 tokens in hex
  const largeApprovalHex = '0x8AC7230489E80000';
  
  // Build the approve call data:
  // Function selector + padded address + padded amount
  const approveData = APPROVE_SELECTOR + 
                    QUIZ_ADDRESS.slice(2).padStart(64, '0') + 
                    largeApprovalHex.slice(2).padStart(64, '0');
  
  // Send approval transaction WITH explicit gas parameters
  try {
    console.log('Sending MiniPay approval transaction...');
    
    const approveHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: CUSD_ADDRESS,
        data: approveData,
        // Provide explicit gas parameters to avoid estimation issues
        gas: '0x30D40', // ~200,000 gas
        gasPrice: '0x3B9ACA00'  // 1 Gwei
      }]
    });
    
    console.log('MiniPay approval transaction sent:', approveHash);
    
    // Wait for approval to be mined (15 seconds in MiniPay)
    console.log('Waiting for approval confirmation...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Send the payEntryFee transaction with explicit gas parameters
    console.log('Sending payment transaction...');
    const paymentHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: QUIZ_ADDRESS,
        data: PAY_FEE_SELECTOR,
        // Provide explicit gas parameters
        gas: '0x30D40', // ~200,000 gas
        gasPrice: '0x3B9ACA00',  // 1 Gwei
        // CRITICAL: Use cUSD as fee currency in MiniPay
        feeCurrency: CUSD_ADDRESS
      }]
    });
    
    console.log('Payment transaction sent:', paymentHash);
    
    // Add delay to ensure transaction is processed
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    return {
      success: true,
      txHash: paymentHash
    };
  } catch (error: any) {
    console.error('MiniPay transaction error:', error);
    
    // Clean up error message for display
    let message = error.message || 'Transaction failed';
    if (message.includes('user rejected')) {
      message = 'Transaction was cancelled';
    } else if (message.includes('insufficient funds')) {
      message = 'Insufficient cUSD balance for transaction';
    } else if (message.includes('execution reverted')) {
      message = 'Transaction failed - please ensure you have enough cUSD';
    }
    
    throw new Error(message);
  }
}

/**
 * Direct credit check for MiniPay
 * Uses aggressive cache-busting to ensure fresh data
 */
export async function miniPayCheckCredits(address: string): Promise<number> {
  console.log('Checking credits directly in MiniPay for:', address);
  
  try {
    // Use relative path instead of environment variable
    const base = '/api';
    
    // Add timestamp to bust cache
    const timestamp = Date.now();
    
    // Construct URL with cache-busting
    const url = `${base}/quiz/user/?address=${address}&_t=${timestamp}`;
    
    console.log('Fetching credits from URL:', url);
    
    // Try multiple times with backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'X-Addr': address,
            'X-MiniPay': '1',
            'X-Force-Refresh': '1' // Signal backend to bypass cache
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`Credit check failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Credits data received:', data);
        
        return data.credits || 0;
      } catch (error) {
        console.error(`Credit check attempt ${attempt + 1} failed:`, error);
        if (attempt === 2) throw error; // Re-throw on final attempt
      }
    }
    
    throw new Error('Credit check failed after retries');
  } catch (error) {
    console.error('Error checking credits:', error);
    return 0; // Return 0 rather than throwing to avoid breaking UI
  }
}