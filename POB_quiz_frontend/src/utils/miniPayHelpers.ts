// utils/miniPayHelpers.ts

/**
 * Detects if the app is running in MiniPay browser
 */
export const isMiniPay = (): boolean => {
  return window.navigator.userAgent.includes('MiniPay');
};

/**
 * Adds a small delay for MiniPay transactions to allow UI to update
 */
export const miniPayDelay = async (ms: number = 1000): Promise<void> => {
  if (isMiniPay()) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  return Promise.resolve();
};

/**
 * Helper to handle transactions with improved UX for MiniPay
 */
export const handleTransaction = async <T>(
  txPromise: Promise<T>,
  options: {
    onStart?: () => void;
    onSuccess?: (result: T) => void;
    onError?: (error: any) => void;
    postDelay?: number;
  }
): Promise<T | undefined> => {
  const { onStart, onSuccess, onError, postDelay = 1500 } = options;
  
  try {
    if (onStart) onStart();
    
    // Add small pre-delay for MiniPay UI to prepare
    await miniPayDelay(500);
    
    const result = await txPromise;
    
    // Add post-transaction delay for MiniPay to sync
    await miniPayDelay(postDelay);
    
    if (onSuccess) onSuccess(result);
    return result;
  } catch (error: any) {
    console.error("Transaction error:", error);
    
    // Provide better error messages for common issues
    let errorMessage = error?.message || "Transaction failed";
    
    if (error?.code === 4001 || errorMessage.includes("user rejected")) {
      errorMessage = "Transaction cancelled";
    } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("insufficient balance")) {
      errorMessage = "Insufficient funds for transaction";
    } else if (errorMessage.includes("insufficient allowance")) {
      errorMessage = "Token approval issue. Please try again in a moment.";
    }
    
    if (onError) onError(errorMessage);
    return undefined;
  }
};