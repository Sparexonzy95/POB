// src/components/MiniPayDebug.tsx - A debug component for MiniPay issues
import { useState, useEffect } from 'react';

export default function MiniPayDebug() {
  const [isShowing, setIsShowing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isMiniPay, setIsMiniPay] = useState(false);

  useEffect(() => {
    // Check if we're in MiniPay
    const inMiniPay = window.navigator.userAgent.includes('MiniPay');
    setIsMiniPay(inMiniPay);

    if (inMiniPay) {
      // Only activate in development or with URL param
      const isDebug = process.env.NODE_ENV === 'development' || 
                    window.location.search.includes('debug=1');
      
      if (isDebug) {
        // Override console.log to capture logs
        const originalLog = console.log;
        const originalError = console.error;
        
        console.log = function(...args) {
          originalLog.apply(console, args);
          setLogs(prev => [...prev, `LOG: ${args.map(a => String(a)).join(' ')}`].slice(-30));
        };
        
        console.error = function(...args) {
          originalError.apply(console, args);
          setLogs(prev => [...prev, `ERROR: ${args.map(a => String(a)).join(' ')}`].slice(-30));
        };
        
        return () => {
          console.log = originalLog;
          console.error = originalError;
        };
      }
    }
  }, []);

  if (!isMiniPay) return null;

  // Check if we should show the debug panel
  const isDebugMode = process.env.NODE_ENV === 'development' || 
                      window.location.search.includes('debug=1');
  
  if (!isDebugMode) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsShowing(!isShowing)}
        className="bg-blue-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg"
      >
        D
      </button>
      
      {isShowing && (
        <div className="absolute bottom-12 right-0 w-80 max-h-96 bg-gray-900 text-gray-200 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 bg-gray-800 flex justify-between items-center">
            <span>MiniPay Debug</span>
            <button
              onClick={() => setLogs([])}
              className="text-xs bg-red-900 px-2 py-0.5 rounded"
            >
              Clear
            </button>
          </div>
          <div className="p-2 overflow-auto max-h-80 text-xs font-mono">
            {logs.length > 0 ? (
              logs.map((log, i) => (
                <div key={i} className={`mb-1 ${log.includes('ERROR') ? 'text-red-400' : ''}`}>
                  {log}
                </div>
              ))
            ) : (
              <div className="opacity-50">No logs yet</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}