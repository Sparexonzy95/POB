// src/components/RegularPayEntryCard.tsx
import { approveThenPayEntry } from '../lib/quiz'
import { useState, useEffect } from 'react'
import Card from '../ui/Card'
import PrimaryButton from '../ui/PrimaryButton'

export default function RegularPayEntryCard({ 
  address, 
  onPaid,
  quantity: externalQuantity 
}: { 
  address?: `0x${string}` | null, 
  onPaid: () => void,
  quantity?: number // Optional prop from parent
}) {
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<'idle' | 'approving' | 'paying'>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [isMiniPay, setIsMiniPay] = useState(false)
  
  // Use external quantity if provided, otherwise use internal state
  const [internalQuantity, setInternalQuantity] = useState(1)
  const quantity = externalQuantity ?? internalQuantity
  
  // Detect MiniPay browser
  useEffect(() => {
    setIsMiniPay(window.navigator.userAgent.includes('MiniPay'));
  }, []);

  async function onClick() {
    if (!address) return alert('Connect wallet first')
    try {
      setBusy(true)
      setErrorMsg(null)
      setInfoMsg(null)
      
      // First show approval state
      setStep('approving')
      
      // Show guidance for MiniPay as INFO, not error
      if (isMiniPay) {
        setInfoMsg(`Two steps. Approve, then confirm ${quantity} payment${quantity > 1 ? 's' : ''}. Keep MiniPay open and wait a few seconds between prompts.`);
        // small delay lets wallet prompt show without UI thrash
        await new Promise(resolve => setTimeout(resolve, 800))
      }
      
      // move to paying stage before kicking off payments
      setStep('paying')
      
      // Start the transaction process with quantity
      // approveThenPayEntry should handle approval once and then N payments
      await approveThenPayEntry((window as any).ethereum, quantity)
      
      // Success
      setErrorMsg(null)
      setInfoMsg('All confirmations complete.')
      setStep('idle')
      
      // For MiniPay, add an extra delay to ensure UI sync
      if (isMiniPay) {
        await new Promise(resolve => setTimeout(resolve, 1200))
      }
      
      // Call the success callback
      onPaid()
    } catch (txError: any) {
      console.error("Transaction error:", txError)
      let finalMessage = txError?.message || "Transaction failed. Please try again."
      
      if (txError?.message?.includes("wallet_switchEthereumChain") || 
          txError?.message?.includes("does not exist")) {
        finalMessage = "Please switch your wallet to the Celo network."
      } else if (txError?.message?.toLowerCase()?.includes("user rejected")) {
        finalMessage = "Transaction was cancelled"
      } else if (txError?.message?.toLowerCase()?.includes("insufficient funds")) {
        finalMessage = "You don't have enough cUSD tokens"
      } else if (
        txError?.message?.toLowerCase()?.includes("insufficient allowance") || 
        (txError?.message?.toLowerCase()?.includes("execution reverted") && 
         txError?.message?.toLowerCase()?.includes("allowance"))
      ) {
        finalMessage = "The approval needs a moment to confirm. Wait 10–15 seconds and try again."
      }
      
      setInfoMsg(null)
      setErrorMsg(finalMessage)
      // keep current step so the button label matches state; user can retry
    } finally {
      setBusy(false)
      // do NOT hard reset step here, success path already set it to 'idle'
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-3">
        {/* Quantity Selector - only show if not controlled by parent */}
        {externalQuantity === undefined && (
          <div className="flex items-center justify-between border-b border-highlight/10 pb-3">
            <div className="text-sm text-highlight/80">Number of Credits</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInternalQuantity(Math.max(1, internalQuantity - 1))}
                disabled={busy || internalQuantity <= 1}
                className="w-8 h-8 rounded-lg bg-highlight/10 hover:bg-highlight/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-highlight font-bold transition-colors"
                aria-label="Decrease"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={10}
                value={internalQuantity}
                onChange={(e) => setInternalQuantity(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                disabled={busy}
                className="w-16 text-center bg-highlight/10 border border-highlight/20 rounded-lg px-2 py-1 text-highlight focus:outline-none focus:border-primary"
              />
              <button
                onClick={() => setInternalQuantity(Math.min(10, internalQuantity + 1))}
                disabled={busy || internalQuantity >= 10}
                className="w-8 h-8 rounded-lg bg-highlight/10 hover:bg-highlight/20 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-highlight font-bold transition-colors"
                aria-label="Increase"
              >
                +
              </button>
            </div>
          </div>
        )}
        
        {/* Purchase Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-highlight/80">Buy {quantity} credit{quantity > 1 ? 's' : ''}</div>
            <div className="text-xs text-highlight/60">
              {isMiniPay 
                ? `Two steps. Approve, then pay ${quantity > 1 ? `${quantity} times` : 'once'}.`
                : `Approve cUSD, then pay ${quantity > 1 ? `${quantity} times` : 'once'}.`
              }
            </div>
          </div>
          <div className="w-48">
            <PrimaryButton onClick={onClick} disabled={busy} className="btn-primary w-full">
              {busy ? (
                step === 'approving' ? 'Approving...' : 
                step === 'paying' ? `Paying${quantity > 1 ? ` ${quantity}×` : '...'}` : 
                'Processing...'
              ) : `Buy ${quantity} Credit${quantity > 1 ? 's' : ''}`}
            </PrimaryButton>
          </div>
        </div>

        {/* Info message display */}
        {infoMsg && !errorMsg && (
          <div className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/30 p-2 rounded">
            {infoMsg}
          </div>
        )}
        
        {/* Error message display */}
        {errorMsg && (
          <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 p-2 rounded">
            {errorMsg}
          </div>
        )}
      </div>
    </Card>
  )
}
