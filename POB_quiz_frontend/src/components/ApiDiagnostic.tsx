// src/components/ApiDiagnostic.tsx
import { useState, useEffect } from 'react';
import { RefreshCcw, AlertTriangle, Check, Globe } from 'lucide-react';

export default function ApiDiagnostic() {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isBusy, setIsBusy] = useState(false);
  
  const runDiagnostic = async () => {
    setIsBusy(true);
    try {
      // Test a few key API endpoints
      const endpoints = ['/api/quiz/state/', '/api/quiz/user/', '/api/tournament/list/'];
      const results: Record<string, boolean> = {};
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'HEAD',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            }
          });
          results[endpoint] = response.ok;
        } catch (e) {
          console.error(`Endpoint check failed for ${endpoint}:`, e);
          results[endpoint] = false;
        }
      }
      
      const allOk = Object.values(results).every(Boolean);
      
      setResult({
        status: allOk ? 'ok' : 'error',
        message: allOk ? 'All API endpoints reachable' : 'Some API endpoints unreachable',
        endpoints: results
      });
    } catch (e) {
      setResult({
        status: 'error',
        message: `API connection check failed: ${e instanceof Error ? e.message : String(e)}`,
        endpoints: {}
      });
    } finally {
      setIsBusy(false);
    }
  };
  
  // Run diagnostic on first open
  useEffect(() => {
    if (isOpen && !result) {
      runDiagnostic();
    }
  }, [isOpen, result]);
  
  // Only show in development environment
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
        title="API Diagnostic"
      >
        <Globe className="w-5 h-5" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-80 bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 bg-gray-800 flex justify-between items-center">
            <span>API Diagnostic</span>
            <button
              onClick={runDiagnostic}
              disabled={isBusy}
              className="text-xs bg-purple-700 px-2 py-0.5 rounded flex items-center gap-1"
            >
              {isBusy ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-3 h-3" />
                  Check
                </>
              )}
            </button>
          </div>
          
          <div className="p-3 space-y-2 text-xs">
            {/* Environment info */}
            <div className="bg-gray-800 p-2 rounded">
              <div className="font-semibold mb-1">Environment:</div>
              <div>MiniPay: {window.navigator.userAgent.includes('MiniPay') ? 'Yes' : 'No'}</div>
              <div>Host: {window.location.hostname}</div>
              <div>Protocol: {window.location.protocol}</div>
            </div>
            
            {/* API status */}
            {result ? (
              <>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="font-semibold mb-1">Status:</div>
                  <div className={`flex items-center gap-2 ${
                    result.status === 'ok' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {result.status === 'ok' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    {result.message}
                  </div>
                </div>
                
                {/* Endpoint checks */}
                <div className="bg-gray-800 p-2 rounded">
                  <div className="font-semibold mb-1">Endpoints:</div>
                  {Object.entries(result.endpoints).map(([endpoint, isOk]) => (
                    <div key={endpoint} className="flex items-center justify-between">
                      <div className="truncate">{endpoint}</div>
                      <div className={isOk ? 'text-green-400' : 'text-red-400'}>
                        {isOk ? 'OK' : 'Failed'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center opacity-50">
                Run diagnostic to see results
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}