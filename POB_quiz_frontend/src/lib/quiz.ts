import { createPublicClient, createWalletClient, custom, http, getContract, Hex } from 'viem'
import { celo } from './chains'
import abi from '../abi/SinglePlayerQuiz.json'

export const QUIZ_ADDRESS = (import.meta.env.VITE_QUIZ_ADDRESS as `0x${string}`) || '0x0000000000000000000000000000000000000000'
export const pub = createPublicClient({ chain: celo, transport: http(import.meta.env.VITE_CELO_RPC || 'https://forno.celo-sepolia.celo-testnet.org') })

export function quizContract() {
  return getContract({ address: QUIZ_ADDRESS, abi, client: pub })
}

async function ensureCelo(windowProvider: any) {
  // Check if we're in MiniPay
  const isMiniPay = window.navigator.userAgent.includes('MiniPay');
  
  // First check what network we're currently on
  const chainId = await windowProvider.request({ method: 'eth_chainId' });
  const correctChainId: Hex = '0xAA044C'; // 11142220 (Celo Sepolia)
  const correctChainIdDecimal = '11142220';
  
  // Normalize chainId for comparison (handle both uppercase and lowercase hex)
  const normalizedChainId = typeof chainId === 'string' ? chainId.toLowerCase() : chainId;
  const normalizedCorrectChainId = correctChainId.toLowerCase();
  
  // If we're already on the Celo network, return early
  if (normalizedChainId === normalizedCorrectChainId || 
      chainId === correctChainIdDecimal ||
      parseInt(chainId, 16) === 11142220) {
    return;
  }
  
  // Not on Celo network
  if (isMiniPay) {
    // For MiniPay, provide clear instructions
    throw new Error('Please switch to Celo Sepolia Testnet in MiniPay: Tap the network name at the top of the app and select "Celo Sepolia Testnet"');
  }
  
  // For other wallets that support network switching
  try {
    await windowProvider.request({ 
      method: 'wallet_switchEthereumChain', 
      params: [{ chainId: correctChainId }] 
    });
  } catch (e: any) {
    // Only try to add the chain if the wallet supports it (error code 4902)
    if (e?.code === 4902) {
      try {
        await windowProvider.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: correctChainId,
            chainName: 'Celo Sepolia Testnet',
            nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
            rpcUrls: [import.meta.env.VITE_CELO_RPC || 'https://forno.celo-sepolia.celo-testnet.org'],
            blockExplorerUrls: ['https://sepolia.celoscan.io']
          }]
        });
      } catch (addError) {
        throw new Error('Please manually switch to Celo Sepolia Testnet in your wallet settings');
      }
    } else if (e?.message?.includes('does not exist')) {
      // Wallet doesn't support switching
      throw new Error('Please manually switch to Celo Mainnet in your wallet');
    } else {
      throw e;
    }
  }
}

export async function approveThenPayEntry(windowProvider: any, quantity: number = 1) {
  if (!windowProvider) throw new Error('No wallet found');
  if (quantity < 1) throw new Error('Quantity must be at least 1');
  
  // Check if we're in MiniPay
  const isMiniPay = window.navigator.userAgent.includes('MiniPay');
  console.log(`Starting payment process for ${quantity} credit(s)`, isMiniPay ? "in MiniPay" : "in standard browser");
  
  try {
    await ensureCelo(windowProvider);
  } catch (e: any) {
    console.error("Network check error:", e);
    if (e?.message?.includes('Please') || e?.message?.includes('Celo')) {
      throw e;
    } else {
      throw new Error('Please ensure you are connected to the Celo network');
    }
  }

  const wallet = createWalletClient({ chain: celo, transport: custom(windowProvider) });
  const [account] = await wallet.getAddresses();
  if (!account) throw new Error('No account connected');
  
  console.log(`Using account: ${account}`);

  const c = quizContract();
  
  // Fetch contract data
  console.log("Fetching contract data (entry fee and cUSD address)...");
  const [entryFee, cUSD] = await Promise.all([c.read.entryFee(), c.read.cUSD()]);
  console.log(`Entry fee: ${entryFee}, cUSD address: ${cUSD}`);
  
  const erc20Abi = [
    { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{name:'owner',type:'address'},{name:'spender',type:'address'}], outputs: [{type:'uint256'}] },
    { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{name:'spender',type:'address'},{name:'amount',type:'uint256'}], outputs: [{type:'bool'}] },
  ] as const;
  
  const erc20 = getContract({ address: cUSD as `0x${string}`, abi: erc20Abi, client: pub });

  // Calculate total amount needed for quantity
  const totalAmount = entryFee * BigInt(quantity);
  
  // For MiniPay: Use an extremely large approval to avoid future issues
  // For standard browsers: Approve exact amount needed
  const approvalAmount = isMiniPay ? entryFee * BigInt(1000000) : totalAmount;
  
  console.log(`Will approve ${approvalAmount} tokens for ${quantity} credit(s) (${isMiniPay ? "large amount for MiniPay" : "exact amount"})`);

  // SIMPLIFY FOR MINIPAY: Always approve, regardless of current allowance
  if (isMiniPay) {
    try {
      console.log("Sending approval transaction...");
      
      const hash = await wallet.writeContract({
        account,
        address: cUSD as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [QUIZ_ADDRESS, approvalAmount],
      });
      
      console.log(`Approval transaction sent with hash: ${hash}`);
      
      // Add a very long delay for MiniPay (10 seconds)
      console.log("Waiting 10 seconds for MiniPay approval confirmation...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      
    } catch (e: any) {
      console.error('Approval error:', e);
      if (e?.message?.includes('user rejected')) {
        throw new Error('Transaction was cancelled');
      }
      throw new Error('Failed to approve tokens: ' + (e?.message || String(e)));
    }
  } else {
    // Standard browsers: Check allowance first
    const allowance = await erc20.read.allowance([account, QUIZ_ADDRESS]);
    console.log(`Current allowance: ${allowance}, Required: ${totalAmount} (${quantity} credits)`);
    
    if (allowance < totalAmount) {
      try {
        console.log(`Approving ${totalAmount} tokens for ${quantity} credit(s)...`);
        await wallet.writeContract({
          account,
          address: cUSD as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [QUIZ_ADDRESS, totalAmount],
        });
      } catch (e: any) {
        console.error('Approval error:', e);
        if (e?.message?.includes('user rejected')) {
          throw new Error('Transaction was cancelled');
        }
        throw new Error('Failed to approve tokens: ' + (e?.message || String(e)));
      }
    } else {
      console.log("Existing allowance is sufficient, skipping approval");
    }
  }

  // Proceed with payment(s) - call payEntryFee once for each credit
  const transactionHashes: string[] = [];
  
  try {
    console.log(`Proceeding with ${quantity} payment transaction(s)...`);
    
    for (let i = 0; i < quantity; i++) {
      console.log(`Processing payment ${i + 1} of ${quantity}...`);
      
      const paymentParams = {
        account,
        address: QUIZ_ADDRESS,
        abi,
        functionName: 'payEntryFee',
        args: [],
      };
      
      const hash = await wallet.writeContract(paymentParams);
      transactionHashes.push(hash);
      console.log(`Payment ${i + 1} transaction hash: ${hash}`);
      
      // Add delay between transactions (longer for MiniPay)
      if (i < quantity - 1) { // Don't wait after the last transaction
        const delayMs = isMiniPay ? 8000 : 2000; // 8s for MiniPay, 2s for others
        console.log(`Waiting ${delayMs}ms before next transaction...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    // Add final delay for MiniPay
    if (isMiniPay) {
      console.log("Waiting after final payment transaction...");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.log(`Successfully purchased ${quantity} credit(s)`);
    return transactionHashes[transactionHashes.length - 1]; // Return last hash for compatibility
  } catch (e: any) {
    console.error('Payment error:', e);
    
    // For debugging in MiniPay
    if (isMiniPay) {
      console.log("Detailed error:", JSON.stringify(e));
    }
    
    // If we completed some transactions, inform the user
    if (transactionHashes.length > 0) {
      throw new Error(`Completed ${transactionHashes.length} of ${quantity} transactions. Error: ${e?.message || String(e)}`);
    }
    
    if (e?.message?.includes('user rejected')) {
      throw new Error('Transaction was cancelled');
    } else if (e?.message?.includes('insufficient funds')) {
      throw new Error('Insufficient funds to pay entry fee');
    } else if (e?.message?.includes('insufficient allowance') || 
              (e?.message?.includes('execution reverted') && e?.message?.includes('allowance'))) {
      if (isMiniPay) {
        // Special message for MiniPay
        throw new Error('The approval transaction may take longer to confirm in MiniPay. Please try again in 15-20 seconds.');
      } else {
        throw new Error('The approval transaction has not completed yet. Please wait a moment and try again.');
      }
    } else if (e?.message?.includes('eth_estimateGas') && e?.message?.includes('allowance')) {
      throw new Error('Please wait 15-20 seconds for the approval to be confirmed, then try again.');
    }
    
    throw new Error('Failed to pay entry fee: ' + (e?.message || String(e)));
  }
}

/* ===== REST helpers for tournament game sessions (backend) ===== */
const API =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API ||
  "/api"; // works with your current Django prefix and .env

async function jfetch<T = any>(
  path: string,
  opts: RequestInit = {},
  addr?: `0x${string}` | null
): Promise<T> {
  const isMiniPay =
    typeof window !== "undefined" &&
    window.navigator.userAgent.includes("MiniPay");

  const baseHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    // Force no cache for MiniPay to avoid stale data
    ...(isMiniPay
      ? {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        }
      : {}),
  };

  if (addr) baseHeaders["X-Addr"] = addr;
  const headers: Record<string, string> = {
    ...baseHeaders,
    ...(opts.headers as Record<string, string> | undefined),
  };

  // Log request details in MiniPay for debugging
  if (isMiniPay) {
    console.log(`API Request: ${API}${path}`, {
      headers,
      body: opts.body,
    });
  }

  try {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers,
      // Add cache no-store for MiniPay
      ...(isMiniPay ? { cache: "no-store" as RequestCache } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`API Error (${res.status}):`, text);
      throw new Error(text || `HTTP ${res.status}`);
    }

    const data = await res.json();

    // Log response in MiniPay for debugging
    if (isMiniPay) {
      console.log(`API Response: ${API}${path}`, data);
    }

    return data as T;
  } catch (error) {
    console.error(`API Fetch Error (${path}):`, error);

    if (isMiniPay) {
      // Special error handling for MiniPay
      console.log("Error in MiniPay, retrying with timeout...");

      // Wait a bit and retry once for MiniPay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      try {
        const res = await fetch(`${API}${path}`, {
          ...opts,
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `HTTP ${res.status}`);
        }

        return (await res.json()) as T;
      } catch (retryError) {
        console.error("Retry failed:", retryError);
        throw retryError;
      }
    }

    throw error;
  }
}

export async function startSession(
  count: number,
  addr?: `0x${string}` | null
): Promise<{
  sessionId: number;
  timeLimit: number;
  expiresAt: string;
  questions: Array<{
    order: number;
    questionId: number;
    text: string;
    difficulty: string;
    category: string;
    options: Array<{ id: number; text: string }>;
  }>;
}> {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch(
    `/quiz/session/start/`,
    { method: "POST", body: JSON.stringify({ count }) },
    addr
  );
}

export async function answerSession(
  sessionId: number,
  answers: Array<{ questionId: number; optionId: number }>,
  addr?: `0x${string}` | null
): Promise<{ ok: boolean }> {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch(
    `/quiz/session/answer/`,
    { method: "POST", body: JSON.stringify({ sessionId, answers }) },
    addr
  );
}

export async function finishSession(
  sessionId: number,
  addr?: `0x${string}` | null
): Promise<{
  sessionId: number;
  correct: number;
  total: number;
  score: number;
  passThreshold: number;
  expiresAt: string;
  tournament?: {
    attempted?: boolean;
    recorded?: boolean;
    reason?: string;
    error?: string;
    txHash?: string;
  };
}> {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch(
    `/quiz/session/finish/`,
    { method: "POST", body: JSON.stringify({ sessionId }) },
    addr
  );
}

export async function getSessionStatus(
  sessionId: number,
  addr?: `0x${string}` | null
): Promise<{ state: string; remainingMs: number; expiresAt: string }> {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch(
    `/quiz/session/status/${sessionId}/`,
    { method: "GET" },
    addr
  );
}
