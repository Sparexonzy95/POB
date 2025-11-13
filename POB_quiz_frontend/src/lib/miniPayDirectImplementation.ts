// src/lib/miniPayDirectImplementation.ts

// Direct, library-free implementation for MiniPay
export async function directMiniPayTransaction(address: string): Promise<{hash: string, success: boolean}> {
  console.log("Using direct MiniPay implementation");
  
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('No wallet provider found');
  
  // Check network - handle both uppercase and lowercase hex
  const chainId = await ethereum.request({ method: 'eth_chainId' });
  const normalizedChainId = typeof chainId === 'string' ? chainId.toLowerCase() : chainId;
  
  if (normalizedChainId !== '0xaa044c' && chainId !== '11142220' && parseInt(chainId, 16) !== 11142220) {
    throw new Error('Please switch to Celo Sepolia Testnet in MiniPay: Tap the network name at top of app and select "Celo Mainnet"');
  }
  
  try {
    // Constants (hardcoded to avoid any import issues)
    const QUIZ_ADDRESS = import.meta.env.VITE_QUIZ_ADDRESS || '0x0000000000000000000000000000000000000000';
    const CUSD_ADDRESS = '0xde9e4c3ce781b4ba68120d6261cbad65ce0ab00b';  // cUSD token on Celo Sepolia
    const ENTRY_FEE = '0x2710'; // 10000 in hex
    const LARGE_APPROVAL = '0x152d02c7e14af6800000'; // A very large number
    
    // Function signatures as hex
    const APPROVE_SIGNATURE = '0x095ea7b3';  // approve(address,uint256)
    const PAY_FEE_SIGNATURE = '0xbe85533d';  // payEntryFee()
    
    // 2. Send approval transaction with a very large amount
    console.log("Sending approval transaction...");
    
    // Prepare data: approve(address spender, uint256 amount)
    // Function selector (4 bytes) + address parameter (32 bytes) + amount parameter (32 bytes)
    const approveData = APPROVE_SIGNATURE + 
                        QUIZ_ADDRESS.slice(2).padStart(64, '0') + 
                        LARGE_APPROVAL.slice(2).padStart(64, '0');
    
    const approveHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: CUSD_ADDRESS,
        data: approveData
      }]
    });
    
    console.log(`Approval transaction sent with hash: ${approveHash}`);
    
    // 3. Wait for approval to be processed
    console.log("Waiting 15 seconds for approval to be processed...");
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // 4. Send payment transaction
    console.log("Sending payment transaction...");
    const paymentHash = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [{
        from: address,
        to: QUIZ_ADDRESS,
        data: PAY_FEE_SIGNATURE
      }]
    });
    
    console.log(`Payment transaction sent with hash: ${paymentHash}`);
    
    // 5. Wait for payment to be processed
    console.log("Waiting 5 seconds for payment to be processed...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return {
      hash: paymentHash,
      success: true
    };
  } catch (error: any) {
    console.error("MiniPay transaction error:", error);
    
    if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was cancelled');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds to pay entry fee');
    }
    
    throw error;
  }
}

// Direct credit checking without any library dependencies
export async function directCreditCheck(address: string): Promise<number | null> {
  try {
    const API = import.meta.env.VITE_API || "";
    const timestamp = Date.now();
    const url = `${API}/quiz/user/?address=${address}&_t=${timestamp}`;
    
    console.log(`Directly checking credits at: ${url}`);
    
    // Make request with all possible cache-busting options
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Addr": address,
        "X-MiniPay": "1",
        "X-Timestamp": timestamp.toString()
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    // Parse response
    const text = await response.text();
    console.log("Raw response:", text);
    
    try {
      const data = JSON.parse(text);
      console.log("Credits data:", data);
      return data.credits;
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Direct credit check failed:", error);
    return null;
  }
}