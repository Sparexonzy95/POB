// src/components/MiniPayEntryCard.tsx
import { useState, useEffect } from 'react';
import Card from '../ui/Card';
import PrimaryButton from '../ui/PrimaryButton';
import { miniPayDirectPayment, miniPayCheckCredits } from '../lib/miniPayDirect';
import { RefreshCcw, AlertTriangle, Check, Loader } from 'lucide-react';

interface PayEntryCardProps {
  address?: `0x${string}` | null;
  onPaid: () => void;
  quantity?: number; // added quantity support
}

export default function MiniPayEntryCard({ address, onPaid, quantity = 1 }: PayEntryCardProps) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<'idle' | 'approving' | 'paying' | 'confirming'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checkingCredits, setCheckingCredits] = useState(false);
  const [manualCredits, setManualCredits] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<'none' | 'pending' | 'success' | 'error'>('none');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
  
  // Clear messages when address changes
  useEffect(() => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setInfoMsg(null);
    setManualCredits(null);
    setLastCheck(null);
    setTransactionStatus('none');
    setLastTxHash(null);
    setStep('idle');
  }, [address]);
  
  // Function to manually check credits with retry logic
  const forceCheckCredits = async () => {
    if (!address) {
      setErrorMsg("Connect wallet first");
      return null;
    }
    
    setCheckingCredits(true);
    try {
      let credits: number | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await sleep(800 * attempt);
          credits = await miniPayCheckCredits(address);
          if (credits !== null) break;
        } catch (retryError) {
          if (attempt === 2) throw retryError;
        }
      }
      if (credits !== null) {
        setManualCredits(credits);
        setLastCheck(Date.now());
        onPaid(); // Update the main UI
      }
      return credits;
    } catch (e) {
      console.error("Manual credit check failed:", e);
      return null;
    } finally {
      setCheckingCredits(false);
    }
  };

  // Handle buy credits action with improved clarity and quantity support
  async function handleBuyCredits() {
    if (!address) {
      setErrorMsg('Please connect your wallet first');
      return;
    }
    
    try {
      // Reset state
      setBusy(true);
      setStep('approving');
      setErrorMsg(null);
      setSuccessMsg(null);
      setInfoMsg(`Two steps. Approve, then confirm ${quantity} payment${quantity > 1 ? 's' : ''}. Keep MiniPay open.`);
      setTransactionStatus('pending');
      
      // 1) Approval: in many MiniPay flows, approval happens within first action.
      // show a small delay so users see the stage clearly
      await sleep(900);
      // switch to paying after approval
      setStep('paying');

      // 2) Payments: loop N times
      for (let i = 1; i <= quantity; i++) {
        const result = await miniPayDirectPayment(address);
        if (!result?.success) {
          throw new Error(result?.message || `Payment ${i} failed`);
        }
        if (result.txHash) setLastTxHash(result.txHash);
        // spacing between MiniPay prompts helps UX
        if (i < quantity) await sleep(1000);
      }
      
      // Confirming/verification
      setStep('confirming');
      setInfoMsg('Verifying credits…');
      await sleep(3000);
      
      // Try to fetch credits a few times
      let creditCount = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await sleep(1500 * attempt);
          creditCount = await miniPayCheckCredits(address);
          if (creditCount !== null) break;
        } catch (creditError) {
          if (attempt === 2) console.error('Credit check failed:', creditError);
        }
      }
      
      if (creditCount !== null) {
        setManualCredits(creditCount);
        setLastCheck(Date.now());
        setSuccessMsg(`Success! You now have ${creditCount} credits.`);
      } else {
        setSuccessMsg('Transaction complete! If credits don’t show yet, use Force Check Credits or refresh.');
      }

      setTransactionStatus('success');
      setErrorMsg(null);
      setInfoMsg('All confirmations complete.');
      onPaid();
    } catch (error: any) {
      console.error('Transaction error:', error);
      const msg =
        error?.message?.toLowerCase()?.includes('user rejected')
          ? 'Transaction was cancelled'
          : error?.message?.toLowerCase()?.includes('insufficient funds')
          ? 'Not enough cUSD'
          : error?.message || 'Transaction failed. Please try again.';
      setInfoMsg(null);
      setSuccessMsg(null);
      setErrorMsg(msg);
      setTransactionStatus('error');
    } finally {
      setBusy(false);
      // keep the current step to reflect failure or success, no forced reset here
    }
  }

  // Generate status indicator
  const renderStatusIndicator = () => {
    if (transactionStatus === 'none') return null;
    
    return (
      <div className={`mt-2 text-xs p-2 rounded border flex items-center gap-2
        ${transactionStatus === 'pending' ? 'bg-blue-400/10 border-blue-400/30 text-blue-400' :
          transactionStatus === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-500' :
          'bg-red-400/10 border-red-400/30 text-red-400'}`
      }>
        {transactionStatus === 'pending' && <Loader className="w-4 h-4 animate-spin" />}
        {transactionStatus === 'success' && <Check className="w-4 h-4" />}
        {transactionStatus === 'error' && <AlertTriangle className="w-4 h-4" />}
        
        <span>
          {transactionStatus === 'pending' && (step === 'approving' ? 'Approving…' : step === 'paying' ? 'Paying…' : 'Processing…')}
          {transactionStatus === 'success' && 'Success'}
          {transactionStatus === 'error' && 'Failed'}
        </span>
        
        {lastTxHash && transactionStatus === 'success' && (
          <a 
            href={`https://celoscan.io/tx/${lastTxHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-auto text-blue-400 underline"
          >
            View
          </a>
        )}
      </div>
    );
  };

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-highlight/80">Buy credit (MiniPay)</div>
            <div className="text-xs text-highlight/60">
              Approve, then pay {quantity > 1 ? `${quantity} times` : 'once'}.
            </div>
          </div>
          <div className="w-48">
            <PrimaryButton onClick={handleBuyCredits} disabled={busy} className="btn-primary w-full">
              {busy ? (
                step === 'approving' ? 'Approving...' : 
                step === 'paying' ? (quantity > 1 ? `Paying ${quantity}×...` : 'Paying...') :
                step === 'confirming' ? 'Confirming...' : 'Processing…'
              ) : `Buy ${quantity > 1 ? `${quantity} Credits` : 'Buy Credits'}`}
            </PrimaryButton>
          </div>
        </div>
        
        {/* Transaction status indicator */}
        {renderStatusIndicator()}
        
        {/* Info message */}
        {infoMsg && !errorMsg && (
          <div className="text-xs text-blue-400 bg-blue-400/10 p-2 rounded border border-blue-400/30">
            {infoMsg}
          </div>
        )}

        {/* Error message display */}
        {errorMsg && (
          <div className="text-xs text-red-400 bg-red-400/10 p-2 rounded border border-red-400/30">
            {errorMsg}
          </div>
        )}
        
        {/* Success message display */}
        {successMsg && (
          <div className="text-xs text-green-500 bg-green-500/10 p-2 rounded border border-green-500/30">
            {successMsg}
          </div>
        )}
        
        {/* MiniPay tips */}
        {!busy && !errorMsg && !successMsg && (
          <div className="text-xs text-blue-400 bg-blue-400/10 p-2 rounded border border-blue-400/30">
            <div className="font-bold mb-1">MiniPay Tips:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>You'll confirm {quantity + 1} transactions total</li>
              <li>Keep MiniPay open during the entire process</li>
              <li>If credits don't appear, use the Force Check button below</li>
              <li>Make sure you're on <span className="font-semibold">Celo Mainnet</span></li>
            </ul>
          </div>
        )}
        
        {/* Credit troubleshooter */}
        <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">MiniPay Credit Checker</div>
            <button 
              onClick={forceCheckCredits}
              disabled={checkingCredits}
              className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600 disabled:opacity-50 flex items-center gap-1"
            >
              {checkingCredits ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-3 h-3" />
                  Force Check Credits
                </>
              )}
            </button>
          </div>
          
          {manualCredits !== null && (
            <div className="flex justify-between items-center text-xs">
              <div>Credits found: <span className="font-bold text-yellow-500">{manualCredits}</span></div>
              {lastCheck && (
                <div className="text-gray-400">
                  {new Date(lastCheck).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Refresh page button */}
        <div className="flex justify-center mt-1">
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 rounded-lg text-[#94C751] hover:bg-[#94C751]/20 text-xs flex items-center gap-1"
          >
            <RefreshCcw className="w-3 h-3" />
            Refresh Page for Latest Data
          </button>
        </div>
      </div>
    </Card>
  );
}
