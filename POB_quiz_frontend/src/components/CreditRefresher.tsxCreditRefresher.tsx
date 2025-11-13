// src/components/CreditRefresher.tsx
import { useState } from 'react';
import { getCredits } from '../lib/api';

export default function CreditRefresher({ address }: { address?: `0x${string}` | null }) {
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(null);
  const [manualCredits, setManualCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkCredits = async () => {
    if (!address) {
      setError("Connect wallet first");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Manually checking credits for address:", address);
      
      // Force a fresh API call bypassing any caching
      const timestamp = Date.now();
      const url = `${import.meta.env.VITE_API || ""}/credits/${address}?_nocache=${timestamp}`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "X-Addr": address
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Manual credit check response:", data);
      
      setManualCredits(data.credits);
      setLastCheck(Date.now());
    } catch (e) {
      console.error("Manual credit check failed:", e);
      setError(`Failed to check: ${e.message}`);
      
      // Try alternative method with getCredits
      try {
        const data = await getCredits(address);
        setManualCredits(data.credits);
        setLastCheck(Date.now());
        setError(null);
      } catch (altError) {
        console.error("Alternative credit check failed:", altError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-yellow-400/10 border border-yellow-400/40 rounded-lg p-3 my-2">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium">Credit Troubleshooter</div>
        <button 
          onClick={checkCredits}
          disabled={loading}
          className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-xs hover:bg-yellow-600 disabled:opacity-50"
        >
          {loading ? "Checking..." : "Force Check Credits"}
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
      
      {error && (
        <div className="text-xs text-red-400 mt-1">{error}</div>
      )}
      
      <div className="text-xs mt-2">
        <div className="font-bold">What to do if credits don't appear:</div>
        <ol className="list-decimal list-inside space-y-1 mt-1">
          <li>Check if transaction succeeded on <a href={`https://celoscan.io/address/${address}`} target="_blank" rel="noreferrer" className="text-blue-400 underline">CeloScan</a></li>
          <li>Click "Force Check Credits" button above</li>
          <li>Try refreshing the browser page</li>
          <li>Wait 1-2 minutes for backend to sync</li>
        </ol>
      </div>
    </div>
  );
}