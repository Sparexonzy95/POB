// src/lib/miniPayHelper.js

// Constants - adjust these for your environment
const QUIZ_ADDRESS = import.meta.env.VITE_QUIZ_ADDRESS || '0x0000000000000000000000000000000000000000';
const CUSD_ADDRESS = '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b'; // cUSD on Celo Sepolia
const DEFAULT_ENTRY_FEE = 10000; // Default value in case we can't read from contract

// Function signatures (from Solidity selectors)
const APPROVE_SELECTOR = '0x095ea7b3'; // approve(address,uint256)
const PAY_FEE_SELECTOR = '0xbe85533d'; // payEntryFee()

/**
 * Direct payment implementation for MiniPay
 * Uses raw ethereum calls with no dependencies
 */
export async function miniPayDirectPayment() {
  // Get the ethereum provider
  const ethereum = window.ethereum;
  if (!ethereum) throw new Error('Wallet not available');
  
  // Get the connected account
  const accounts = await ethereum.request({ method: 'eth_accounts' });
  const account = accounts[0];
  if (!account) throw new Error('Please connect your wallet first');
  
  // Check network
  // Check network - handle both uppercase and lowercase hex
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  const normalizedChainId = typeof chainId === 'string' ? chainId.toLowerCase() : chainId;
  
  if (normalizedChainId !== '0xaa044c' && chainId !== '11142220' && parseInt(chainId, 16) !== 11142220) {
    throw new Error('Please switch to Celo Sepolia Testnet in MiniPay');
  }
  
  // Step 1: Create approve transaction data
  // We'll use a large approval amount (represented as hex)
  // This is 1,000,000 * entry fee in hex to avoid decimal issues
  const largeApproval = '0x0DE0B6B3A7640000'; // 1 ether in hex (adjust as needed)
  
  // Build the approve call data:
  // Function selector + padded address + padded amount
  const approveData = APPROVE_SELECTOR + 
                    QUIZ_ADDRESS.slice(2).padStart(64, '0') + 
                    largeApproval.slice(2).padStart(64, '0');
  
  // Step 2: Send approval transaction WITHOUT gas estimation
  // This is key - we provide gas parameters directly to avoid estimation failures
  try {
    const approveHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: account,
        to: CUSD_ADDRESS,
        data: approveData,
        // Provide explicit gas parameters to avoid estimation
        gas: '0x30D40', // ~200,000 gas
        gasPrice: '0x77359400'  // 2 Gwei
      }]
    });
    
    console.log('Approval transaction sent:', approveHash);
    
    // Wait for approval to be mined
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 3: Send the payEntryFee transaction with explicit gas parameters
    const paymentHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: account,
        to: QUIZ_ADDRESS,
        data: PAY_FEE_SELECTOR,
        // Provide explicit gas parameters
        gas: '0x30D40', // ~200,000 gas
        gasPrice: '0x77359400'  // 2 Gwei
      }]
    });
    
    console.log('Payment transaction sent:', paymentHash);
    
    // Add delay to ensure transaction is processed
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return {
      success: true,
      approveHash,
      paymentHash
    };
    
  } catch (error) {
    console.error('Transaction error:', error);
    throw new Error(getReadableError(error));
  }
}

/**
 * Direct credit check for MiniPay
 * Uses a proxy approach to avoid CORS issues
 */
export async function miniPayCheckCredits(address) {
  if (!address) {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    address = accounts[0];
    if (!address) throw new Error('Wallet not connected');
  }
  
  try {
    // We'll use a different approach - try both API endpoints
    const timestamp = Date.now();
    
    // For MiniPay, we need to ensure proper URL formatting
    const API_BASE = import.meta.env.VITE_API || '';
    
    // Make sure the base has no trailing slash
    const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    
    // Try different URL formats to handle potential MiniPay quirks
    const urls = [
      `${base}/quiz/user/?address=${address}&_t=${timestamp}`,
      `${base}/quiz/user?address=${address}&_t=${timestamp}`,
      `${base}/credits/${address}?_t=${timestamp}`
    ];
    
    let error = null;
    
    // Try each URL in sequence
    for (const url of urls) {
      try {
        console.log('Trying URL:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Addr': address
          },
          cache: 'no-store'
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Credit data:', data);
          return data.credits;
        }
      } catch (e) {
        error = e;
        console.error('Fetch attempt failed:', e);
      }
    }
    
    // If we get here, all attempts failed
    throw error || new Error('Failed to check credits');
  } catch (error) {
    console.error('Credit check error:', error);
    throw error;
  }
}

// Helper to extract readable error messages
function getReadableError(error) {
  if (typeof error === 'string') return error;
  
  const message = error?.message || 'Unknown error';
  
  if (message.includes('user rejected')) {
    return 'Transaction was cancelled';
  } else if (message.includes('insufficient funds')) {
    return 'Insufficient funds to complete transaction';
  } else if (message.includes('execution reverted')) {
    return 'Transaction failed - please ensure you have enough cUSD';
  }
  
  return message;
}