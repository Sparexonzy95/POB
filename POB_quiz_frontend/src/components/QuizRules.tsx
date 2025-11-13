import { useState, useEffect } from 'react';
import { CheckCircle, Clock, Brain } from 'lucide-react';

export default function QuizRules() {
  const [timeLimit, setTimeLimit] = useState<number>(20);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    async function fetchTimeLimit() {
      setIsLoading(true);
      try {
        // Extreme cache busting for stubborn caches
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        
        console.log('Fetching time limit in QuizRules...');
        
        const response = await fetch(`/api/quiz/settings?_t=${timestamp}&_r=${randomStr}`, {
          method: 'GET', // Force GET method
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'X-Force-Refresh': '1' 
          },
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch settings: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('QuizRules: Fetched settings:', data); // Debug log
        
        if (data && data.timeLimit && typeof data.timeLimit === 'number') {
          console.log(`QuizRules: Setting time limit to ${data.timeLimit} seconds`);
          setTimeLimit(data.timeLimit);
        } else {
          console.warn('Invalid timeLimit in API response:', data);
        }
      } catch (error) {
        console.error('Failed to fetch time limit:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Call it immediately 
    fetchTimeLimit();
    
    // And also set up a retry
    const retryTimer = setTimeout(() => {
      console.log('Retrying time limit fetch in QuizRules...');
      fetchTimeLimit();
    }, 2000);
    
    return () => clearTimeout(retryTimer);
  }, []);

  return (
    <div className="bg-surface p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#1c2a0c]/50 rounded-xl p-3 flex flex-col items-center text-center">
          <Clock className="w-6 h-6 text-[#94C751] mb-1" />
          <div className="text-xs opacity-70">Time Limit</div>
          {isLoading ? (
            <div className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin mt-1"></div>
          ) : (
            <div className="text-base font-semibold text-[#C9E3A8]">{timeLimit} seconds</div>
          )}
        </div>
        
        <div className="bg-[#1c2a0c]/50 rounded-xl p-3 flex flex-col items-center text-center">
          <Brain className="w-6 h-6 text-[#94C751] mb-1" />
          <div className="text-xs opacity-70">Questions</div>
          <div className="text-base font-semibold text-[#C9E3A8]">10 questions</div>
        </div>
      </div>
      
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-[#94C751] shrink-0 mt-0.5" />
          <div className="text-xs text-highlight/90">Answer <span className="font-semibold text-[#C9E3A8]">all questions correctly</span> to win</div>
        </div>
        
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-[#94C751] shrink-0 mt-0.5" />
          <div className="text-xs text-highlight/90">Each quiz costs <span className="font-semibold text-[#C9E3A8]">1 credit</span> to play</div>
        </div>
        
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-[#94C751] shrink-0 mt-0.5" />
          <div className="text-xs text-highlight/90">Win <span className="font-semibold text-[#C9E3A8]">1.8× your entry fee</span> (after 10% fee)</div>
        </div>
        
        <div className="flex items-start gap-2 mt-3">
          <div className="w-4 h-4 shrink-0" />
          <div className="text-xs italic opacity-60">Questions are randomly selected. Timer starts when you begin.</div>
        </div>
      </div>
    </div>
  );
}