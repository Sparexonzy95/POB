// src/components/MiniPayEntryCard.jsx
import { useState } from 'react';
import Card from '../ui/Card';
import PrimaryButton from '../ui/PrimaryButton';
import { miniPayDirectPayment, miniPayCheckCredits } from '../lib/miniPayHelper';

export default function MiniPayEntryCard({ address, onPaid }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('idle');
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [credits, setCredits] = useState(null);

  // Handle buy credits action
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
      
      // Show info message
      setErrorMsg('In MiniPay, you\'ll need to confirm two transactions: first approve, then pay. Wait for the first to complete.');
      
      // Execute the payment
      await miniPayDirectPayment();
      
      // Payment succeeded
      setStep('confirming');
      setErrorMsg(null);
      setSuccessMsg('Transaction successful! Checking credits...');
      
      // Check for credits
      try {
        const creditCount = await miniPayCheckCredits(address);
        setCredits(creditCount);
        setSuccessMsg(`Success! You now have ${creditCount} credits.`);
        onPaid(); // Call the callback
      } catch (creditError) {
        console.error('Credit check failed:', creditError);
        setSuccessMsg('Transaction complete! Please refresh the page to see your updated credits.');
      }
      
    } catch (error) {
      console.error('Transaction error:', error);
      setErrorMsg(error.message || 'Transaction failed. Please try again.');
    } finally {
      setBusy(false);
      setStep('idle');
    }
  }
  
  // Handle manual credit check
  async function handleCheckCredits() {
    try {
      setSuccessMsg('Checking credits...');
      const creditCount = await miniPayCheckCredits(address);
      setCredits(creditCount);
      setSuccessMsg(`You have ${creditCount} credits.`);
      onPaid();
    } catch (error) {
      setErrorMsg('Failed to check credits: ' + error.message);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-highlight/80">Buy credit</div>
            <div className="text-xs text-highlight/60">
              Approve cUSD & pay (two steps)
            </div>
          </div>
          <div className="w-48">
            <PrimaryButton onClick={handleBuyCredits} disabled={busy} className="btn-primary w-full">
              {busy ? (
                step === 'approving' ? 'Approving...' : 
                step === 'confirming' ? 'Confirming...' : 'Processing…'
              ) : 'Approve + Pay Entry'}
            </PrimaryButton>
          </div>
        </div>
        
        {/* Messages */}
        {errorMsg && (
          <div className={`text-xs ${
            errorMsg.includes('confirm two transactions')
              ? "text-blue-400 bg-blue-400/10 border-blue-400/30" 
              : "text-red-400 bg-red-400/10 border-red-400/30"
          } p-2 rounded border`}>
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="text-xs text-green-500 bg-green-500/10 p-2 rounded border border-green-500/30">
            {successMsg}
          </div>
        )}
        
        {/* Manual credit check button */}
        <div className="mt-3">
          <button 
            onClick={handleCheckCredits}
            className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600"
          >
            Check Credits Manually
          </button>
        </div>
      </div>
    </Card>
  );
}