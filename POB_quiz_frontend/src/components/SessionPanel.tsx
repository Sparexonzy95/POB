// SessionPanel.tsx - FIXED VERSION
// Key changes: Added `&& !result` condition to all quiz UI elements
// This ensures question panel, timer, and navigation hide when results show

import { useEffect, useMemo, useRef, useState } from 'react'
import { startSession, submitAnswers, finish, status } from '../lib/api'
import Card from '../ui/Card'
import OptionButton from '../ui/OptionButton'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Home, RotateCcw, Clock, ChevronLeft, ChevronRight, Trophy, CheckCircle2, XCircle } from 'lucide-react'

type Q = {
  order: number
  questionId: number
  text: string
  difficulty: string
  category: string
  options: { id: number; text: string }[]
}

const PENDING_CREDITS_KEY = 'pendingCreditDeductions';
const getPendingCredits = () => {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(PENDING_CREDITS_KEY) || '0', 10);
};

const increasePendingCredits = () => {
  if (typeof window === 'undefined') return;
  const current = getPendingCredits();
  localStorage.setItem(PENDING_CREDITS_KEY, (current + 1).toString());
};

export default function SessionPanel({ 
  address,
  onNavigate,
  refreshCredits,
  refreshStats
}: { 
  address?: `0x${string}` | null,
  onNavigate?: (tab: string) => void,
  refreshCredits?: () => void,
  refreshStats?: () => void
}) {
  const [session, setSession] = useState<{ sessionId: number; questions: Q[]; expiresAt: string } | null>(null)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [countdown, setCountdown] = useState<number>(0)
  const [result, setResult] = useState<any>(null)
  const [idx, setIdx] = useState(0)
  const [lastChosen, setLastChosen] = useState<number | null>(null)
  const submittingRef = useRef(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [questionTransition, setQuestionTransition] = useState(false)
  const [timeLimit, setTimeLimit] = useState<number>(20)
  const [payoutStatus, setPayoutStatus] = useState<'none' | 'sending' | 'confirmed'>('none')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [creditUsed, setCreditUsed] = useState(false)
  const creditUpdatedRef = useRef(false)

  const currentQ = useMemo(() => (session ? session.questions[idx] : null), [session, idx])
  const isLast = useMemo(() => (!!session && idx === session.questions.length - 1), [session, idx])
  
  const progress = useMemo(() => {
    if (!session || !session.questions.length) return 0
    return ((idx + 1) / session.questions.length) * 100
  }, [session, idx])

  useEffect(() => {
    async function fetchTimeLimit() {
      try {
        if (session?.timeLimit) {
          setTimeLimit(session.timeLimit);
          return;
        }
        
        if (address && session?.sessionId) {
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(7);
          
          try {
            const response = await fetch(`/api/quiz/session/status/${session.sessionId}?_t=${timestamp}&_r=${randomStr}`, {
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Addr': address,
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.remainingMs) {
                const calculatedTimeLimit = Math.ceil(data.remainingMs / 1000);
                if (calculatedTimeLimit > 0) {
                  console.log(`Setting time limit to ${calculatedTimeLimit}s from status`);
                  setTimeLimit(calculatedTimeLimit);
                }
              }
            }
          } catch (e) {
            console.error('Failed to fetch session status:', e);
          }
        }
      } catch (error) {
        console.error('Error in time limit fetch:', error);
      }
    }
    
    fetchTimeLimit();
  }, [session, address]);

  const forceUpdateCreditDisplay = () => {
    if (!refreshCredits || creditUpdatedRef.current) return;
    
    console.log('Updating credit display');
    creditUpdatedRef.current = true;
    increasePendingCredits();
    refreshCredits();
    
    const refreshIntervals = [2000, 5000, 10000, 20000];
    refreshIntervals.forEach(delay => {
      setTimeout(() => {
        if (refreshCredits) refreshCredits();
      }, delay);
    });
  };

  async function start() {
    if (!address) return alert('Connect wallet first')
    setError(null)
    setStarting(true)
    
    try {
      console.log('Starting session...', address);
      const s = await startSession(address, 10)
      console.log('Session started:', s);
      setSession(s)
      setAnswers({})
      setResult(null)
      setIdx(0)
      setLastChosen(null)
      setPayoutStatus('none')
      setTxHash(null)
      submittingRef.current = false
      setIsFinishing(false)
      setCreditUsed(false)
      creditUpdatedRef.current = false;
      
      if (s && s.timeLimit) {
        console.log(`Setting time limit from session: ${s.timeLimit}s`);
        setTimeLimit(s.timeLimit);
      }
      
      forceUpdateCreditDisplay();
      setCreditUsed(true);
      
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err instanceof Error ? err.message : String(err))
      alert(`Failed to start quiz: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setStarting(false)
    }
  }

  async function chooseOption(q: Q, optionId: number) {
    if (submittingRef.current) return
    submittingRef.current = true

    setAnswers(a => ({ ...a, [q.questionId]: optionId }))
    setLastChosen(optionId)

    try {
      const submitPromise = submitAnswers(address!, session!.sessionId, [{
        questionId: q.questionId,
        optionId,
      }]);

      if (isLast) {
        await submitPromise.catch(e => {
          console.error('Error submitting last answer:', e);
        });
        
        setTimeout(() => {
          doSubmitAndFinish();
        }, 300);
      } else {
        setQuestionTransition(true);
        setTimeout(() => {
          setIdx(i => i + 1);
          setLastChosen(null);
          setQuestionTransition(false);
          submittingRef.current = false;
        }, 150);
        
        submitPromise.catch(e => {
          console.error('Background answer submission failed:', e);
        });
      }
    } catch (e: any) {
      console.error('Failed to save answer:', e);
      alert('Could not save your answer – please try again.');
      submittingRef.current = false;
    }
  }

  async function doSubmitAndFinish() {
    if (!address || !session) return;
    if (isFinishing) return;
    
    setIsFinishing(true);
    submittingRef.current = true;
    
    console.log('Submitting and finishing quiz...');
    
    try {
      const finishPromise = finish(address, session.sessionId);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Finish request timed out after 15 seconds')), 15000);
      });
      
      const res = await Promise.race([finishPromise, timeoutPromise]) as any;
      console.log('Finish result:', res);
      
      setResult(res);

      if (res.passed) {
        setPayoutStatus('sending');
        pollPayoutStatus();
        setTimeout(() => {
          setShowSuccess(true);
          triggerCelebration();
        }, 500);
      }
      
      if (!creditUsed) {
        setCreditUsed(true);
        forceUpdateCreditDisplay();
      }
      
      if (refreshStats) {
        refreshStats();
        setTimeout(refreshStats, 5000);
      }
      
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('session:completed', { 
          detail: { 
            sessionId: session.sessionId, 
            passed: !!res.passed,
            creditUsed: true
          } 
        });
        window.dispatchEvent(event);
        console.log('Dispatched session:completed event with creditUsed=true');
      }
      
    } catch (error) {
      console.error('Error in submitting results:', error);
      alert(`Failed to submit quiz: ${error instanceof Error ? error.message : String(error)}`);
      
      submittingRef.current = false;
      setIsFinishing(false);
      
      if (!creditUsed) {
        setCreditUsed(true);
        forceUpdateCreditDisplay();
      }
    }
  }

  function pollPayoutStatus() {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const r = await fetch(`/api/settlement/status/?session=${session?.sessionId}&addr=${address}`);
        const d = await r.json();
        if (d.tx_hash) {
          setPayoutStatus('confirmed');
          setTxHash(d.tx_hash);
          clearInterval(interval);
          
          if (refreshCredits) refreshCredits();
          if (refreshStats) refreshStats();
        }
      } catch (err) {
        console.error('Error polling for payment:', err);
      }
      
      if (attempts > 15) clearInterval(interval);
    }, 3000);
  }

  function triggerCelebration() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  function goToNextQuestion() {
    if (isLast) return;
    setQuestionTransition(true);
    setTimeout(() => {
      setIdx(i => Math.min((session?.questions.length || 1) - 1, i + 1));
      setQuestionTransition(false);
    }, 150);
  }
  
  function goToPreviousQuestion() {
    if (idx === 0) return;
    setQuestionTransition(true);
    setTimeout(() => {
      setIdx(i => Math.max(0, i - 1));
      setQuestionTransition(false);
    }, 150);
  }

  function goHome() {
    if (onNavigate) {
      onNavigate('home');
    }
  }

  function playAgain() {
    setSession(null);
    setResult(null);
    setAnswers({});
    setShowSuccess(false);
    setPayoutStatus('none');
    setTxHash(null);
    submittingRef.current = false;
    setIsFinishing(false);
    setCreditUsed(false);
    creditUpdatedRef.current = false;
    
    if (refreshCredits) refreshCredits();
    if (refreshStats) refreshStats();
    
    setTimeout(() => {
      start();
    }, 1500);
  }

  useEffect(() => {
    let h: any;
    
    async function tick() {
      if (!address || !session) return;
      try {
        const s = await status(address, session.sessionId);
        setCountdown(s.remainingMs);
        
        if (s.remainingMs <= 0 && !result && !isFinishing) {
          if (!creditUsed) {
            setCreditUsed(true);
            forceUpdateCreditDisplay();
          }
          doSubmitAndFinish();
        }
      } catch (err) {
        console.error('Error checking status:', err);
      }
    }
    
    if (address && session) {
      tick();
      h = setInterval(tick, 1000);
    }
    
    return () => {
      if (h) clearInterval(h);
    };
  }, [address, session, result, isFinishing, creditUsed]);

  const formattedTime = useMemo(() => {
    if (countdown <= 0) return '0:00';
    const seconds = Math.ceil(countdown / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, [countdown]);

  const pct = session ? Math.max(0, Math.min(100, (countdown / (timeLimit * 1000)) * 100)) : 0;
  const barColor = countdown <= 5000 ? 'bg-error' : 'bg-primary';

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-primary">Quiz Session</div>
          <button
            onClick={start}
            disabled={starting}
            className="px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-60 transition-all duration-300"
          >
            {starting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#101707]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting...
              </span>
            ) : (
              "Start Quiz (1 credit)"
            )}
          </button>
        </div>

        {error && (
          <div className="p-3 mb-2 rounded-lg bg-red-100 border border-red-300 text-red-700">
            <div className="font-medium">Error</div>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {/* ✅ FIXED: Only show when session exists AND no result yet */}
        {session && !result && (
          <>
            <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-secondary/60">
              <motion.div 
                className={`h-2 ${barColor}`}
                initial={{ width: "100%" }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-highlight/80">
                <Clock className={`w-4 h-4 ${countdown <= 5000 ? "text-error" : "text-highlight/80"}`} />
                <div>
                  <span className={countdown <= 5000 ? "text-error font-semibold animate-pulse" : "text-highlight"}>
                    {formattedTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="text-highlight/80">Question {idx + 1}/{session.questions.length}</div>
              </div>
            </div>
          </>
        )}

        {/* ✅ FIXED: Only show when session exists AND no result yet */}
        {session && currentQ && !result && (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ.questionId}
              initial={{ opacity: 0, x: questionTransition ? 20 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
              className="p-4 rounded-xl bg-surface border border-secondary/60"
            >
              <div className="font-medium text-highlight text-lg mb-4">
                {currentQ.order}. {currentQ.text}
              </div>
              <div className="space-y-3">
                {currentQ.options.map((o, index) => {
                  const state: 'idle'|'selected'|'correct'|'wrong' =
                    lastChosen === o.id ? 'selected' : 'idle'
                  return (
                    <motion.div
                      key={o.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.1, delay: index * 0.05 }}
                    >
                      <OptionButton
                        text={o.text}
                        state={state}
                        onClick={() => chooseOption(currentQ, o.id)}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* ✅ FIXED: Only show when session exists AND no result yet */}
        {session && !result && (
          <div className="flex items-center justify-between mt-2">
            <button
              disabled={!session || idx === 0}
              onClick={goToPreviousQuestion}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-secondary/60 text-highlight hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="flex items-center gap-2">
              {!isLast && (
                <button
                  disabled={!session || idx >= (session?.questions.length || 1) - 1}
                  onClick={goToNextQuestion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-secondary/60 text-highlight hover:bg-secondary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={doSubmitAndFinish}
                disabled={!session || countdown <= 0 || isFinishing}
                className="px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                {isFinishing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#101707]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit & Finish"
                )}
              </button>
            </div>
          </div>
        )}

        {/* ✅ Result panel - only shows when result exists */}
        {result && (
          <AnimatePresence>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className={`p-6 rounded-xl border ${result.passed ? 'border-[#94C751]/60' : 'border-secondary/60'} shadow-lg text-center`}
                style={{ 
                  background: result.passed 
                    ? 'linear-gradient(145deg, #587E28, #94C751)' 
                    : 'linear-gradient(145deg, #263711, #3b5119)' 
                }}
              >
                {result.passed && payoutStatus === 'sending' && (
                  <div className="flex items-center justify-center gap-2 mb-3 text-background">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span>Sending reward...</span>
                  </div>
                )}

                {result.passed && payoutStatus === 'confirmed' && (
                  <div className="mb-3 text-background">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Reward sent!</span>
                    </div>
                    <a href={`https://celoscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                      View on CeloScan
                    </a>
                  </div>
                )}

                {showSuccess && result.passed && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex justify-center mb-3"
                  >
                    <div className="relative">
                      <Trophy className="w-16 h-16 text-[#ffd166]" />
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 w-full h-full rounded-full border-2 border-[#ffd166] border-dashed opacity-70"
                      />
                    </div>
                  </motion.div>
                )}
                
                <div className="text-xl font-bold mb-3 text-background">
                  {result.passed ? 'Congratulations!' : 'Good try!'}
                </div>
                
                <div className="text-4xl font-extrabold text-background mb-3 flex justify-center items-center gap-2">
                  {result.passed ? (
                    <CheckCircle2 className="w-6 h-6 text-background" />
                  ) : (
                    <XCircle className="w-6 h-6 text-background/80" />
                  )}
                  {result.correct}/{result.total}
                </div>
                
                <div className="text-background text-lg">
                  {result.passed 
                    ? "Perfect score! Reward will be sent to your wallet." 
                    : `You need all correct answers to win rewards`}
                </div>
                
                <div className="mt-2 text-sm text-background/80">
                  1 credit was used for this attempt.
                </div>
              </div>
              
              <div className="flex items-center justify-between gap-3 mt-4">
                <button 
                  onClick={playAgain} 
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary/60 text-highlight hover:bg-secondary/40 transition-all duration-300"
                >
                  <RotateCcw className="w-4 h-4" />
                  Play Again
                </button>
                
                <button
                  onClick={goHome}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] transition-all duration-300"
                >
                  <Home className="w-4 h-4" />
                  Back to Home
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </Card>
    </div>
  )
}