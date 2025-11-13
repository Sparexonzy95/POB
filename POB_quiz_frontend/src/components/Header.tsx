import { useState, useEffect } from 'react'
import { startCreditPolling, stopCreditPolling } from '../lib/api'

export default function Header({ address }: { address?: `0x${string}` | null }) {
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    if (address) {
      startCreditPolling(address, setCredits)
    } else {
      stopCreditPolling()
      setCredits(null)
    }
    return () => stopCreditPolling()
  }, [address])

  return (
    <header className="flex items-center justify-between p-4 bg-surface border-b border-secondary/60">
      <h1 className="text-xl font-bold text-primary">Quiz App</h1>
      <div className="flex items-center gap-4">
        {address && (
          <div className="text-sm">
            <span className="text-highlight/80">Credits:</span>{' '}
            <span className="font-bold text-primary">
              {credits !== null ? credits : '...'}
            </span>
          </div>
        )}
        <w3m-button />
      </div>
    </header>
  )
}