// src/pages/TournamentPlay.tsx - FIXED VERSION with iPhone compatibility
// Key fixes:
// 1. 5-second auto-submit buffer (instead of 1 second) for iPhone
// 2. Retry logic for answer submission and session finish
// 3. Network status detection
// 4. Better error handling

import { useEffect, useMemo, useRef, useState } from "react";
import Card from "../ui/Card";
import PrimaryButton from "../ui/PrimaryButton";
import { answerSession } from "../lib/quiz";
import { 
  getTournamentInfo, 
  TOURNAMENT_ID,
  startTournamentSession,
  finishTournamentSession
} from "../lib/tournament";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  CheckCircle2, 
  AlertCircle, 
  Timer, 
  Trophy, 
  ArrowLeft, 
  Home, 
  Medal,
  WifiOff
} from "lucide-react";

export default function TournamentPlay({
  address,
  tournamentId = TOURNAMENT_ID,
  onNavigate
}: {
  address?: `0x${string}` | null;
  tournamentId?: number;
  onNavigate?: (tab: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [timeLimit, setTimeLimit] = useState<number>(0);
  const [questions, setQuestions] = useState<Array<{
    order: number;
    questionId: number;
    text: string;
    difficulty: string;
    category: string;
    options: Array<{ id: number; text: string }>;
  }>>([]);

  const [info, setInfo] = useState<any>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState<null | {
    correct: number;
    total: number;
    passed: boolean;
    txHash?: string;
    recorded?: boolean;
    reason?: string;
    error?: string;
  }>(null);
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [questionTransition, setQuestionTransition] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // ✅ Network status detection
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Timer
  const startedAtRef = useRef<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const timerRef = useRef<any>(null);
  const autoSubmitTriggeredRef = useRef<boolean>(false);

  // ✅ FIX: Auto-submit BEFORE time runs out (5 second buffer for iPhone compatibility)
  useEffect(() => {
    if (remaining <= 5 && sessionId && !finished && !submitting && !autoSubmitTriggeredRef.current) {
      console.log('⏰ Time expiring soon (5s buffer for mobile) - auto submitting');
      autoSubmitTriggeredRef.current = true;
      onSubmitAll();
    }
  }, [remaining, sessionId, finished, submitting]);

  useEffect(() => {
    if (timeLimit > 0 && startedAtRef.current > 0 && !finished) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const newRemaining = Math.max(0, timeLimit - elapsed);
        setRemaining(newRemaining);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [timeLimit, finished]);

  // ✅ Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Network connection restored');
      setIsOnline(true);
    };
    const handleOffline = () => {
      console.log('📵 Network connection lost');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load tournament meta
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const i = await getTournamentInfo(tournamentId);
        setInfo(i);
      } finally {
        setLoading(false);
      }
    })();
  }, [tournamentId]);

  const qps = info?.questionsPerSession || 10;
  const tpq = info?.timePerQuestion || 30;

  const formattedTime = useMemo(() => {
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  }, [remaining]);

  async function onStart() {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    try {
      setStarting(true);
      const result = await startTournamentSession(tournamentId, address);
      const { sessionId: sid, questions: qs, timeLimit: tl } = result;

      setSessionId(sid);
      setQuestions(qs);
      setTimeLimit(tl);
      setIdx(0);
      setAnswers({});
      setFinished(null);
      setSelectedAnswer(null);
      autoSubmitTriggeredRef.current = false;

      // Start timer
      startedAtRef.current = Date.now();
      setRemaining(tl);

      console.log(`✅ Session started: ${sid}, ${qs.length} questions, ${tl}s time limit`);
    } catch (e: any) {
      console.error("Start session error:", e);
      alert(e?.message || "Failed to start session");
    } finally {
      setStarting(false);
    }
  }

function pickOption(questionId: number, optionId: number) {
  if (submitting) return;
  
  setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  setSelectedAnswer(optionId);
  
  // Flash effect
  const btn = document.activeElement as HTMLButtonElement;
  if (btn) {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 150);
  }
  
  // Auto-advance to next question
  if (idx < questions.length - 1) {
    setTimeout(() => {
      setQuestionTransition(true);
      setTimeout(() => {
        setIdx(idx + 1);
        setSelectedAnswer(null);
        setQuestionTransition(false);
      }, 300);
    }, 500);
  } else {
    // Last question - auto-submit after short delay
    setTimeout(() => {
      onSubmitAll();
    }, 1000);
  }
}

  // ✅ FIX: Enhanced submission with retry logic and better error handling
  async function onSubmitAll() {
    if (!address || !sessionId) return;
    if (submitting) return; // Prevent double submission
    
    try {
      setSubmitting(true);
      
      // Prepare answers
      const body = Object.entries(answers).map(([qid, oid]) => ({
        questionId: Number(qid),
        optionId: Number(oid),
      }));
      
      console.log(`📤 Submitting ${body.length} answers for session ${sessionId}`);
      
      // ✅ FIX: Retry logic for answer submission (3 attempts)
      let answerSubmitted = false;
      for (let attempt = 0; attempt < 3 && !answerSubmitted; attempt++) {
        try {
          await answerSession(sessionId, body, address);
          console.log(`✅ Answers submitted successfully on attempt ${attempt + 1}`);
          answerSubmitted = true;
        } catch (answerError: any) {
          console.error(`❌ Attempt ${attempt + 1} failed:`, answerError);
          if (attempt < 2) {
            console.log(`⏳ Waiting 1s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
          }
        }
      }
      
      if (!answerSubmitted) {
        console.error('❌ Failed to submit answers after 3 attempts');
        throw new Error('Failed to submit answers after 3 attempts. Please check your connection.');
      }
      
      // ✅ FIX: Retry logic for session finish (3 attempts)
      let sessionFinished = false;
      let result: any = null;
      
      for (let attempt = 0; attempt < 3 && !sessionFinished; attempt++) {
        try {
          result = await finishTournamentSession(sessionId, tournamentId, address);
          console.log(`✅ Session finished successfully on attempt ${attempt + 1}:`, result);
          sessionFinished = true;
        } catch (finishError: any) {
          console.error(`❌ Finish attempt ${attempt + 1} failed:`, finishError);
          
          // ✅ FIX: If session expired, try to get the results anyway
          if (finishError?.message?.includes('expired') || finishError?.message?.includes('Expired')) {
            console.log('⏰ Session expired - attempting to retrieve results...');
            
            try {
              const statusRes = await fetch(`/api/tournament/session/${sessionId}/status/`, {
                headers: { 'X-Addr': address }
              });
              
              if (statusRes.ok) {
                const statusData = await statusRes.json();
                console.log('📊 Retrieved expired session status:', statusData);
                result = statusData;
                sessionFinished = true;
                break;
              }
            } catch (statusError) {
              console.error('❌ Failed to retrieve status:', statusError);
            }
          }
          
          if (attempt < 2 && !sessionFinished) {
            console.log(`⏳ Waiting 1s before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (!sessionFinished || !result) {
        // Last resort - try to get status one more time
        try {
          const statusRes = await fetch(`/api/tournament/session/${sessionId}/status/`, {
            headers: { 'X-Addr': address }
          });
          
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            result = statusData;
          } else {
            throw new Error('Failed to finish session and retrieve status');
          }
        } catch (e) {
          throw new Error('Failed to submit quiz after multiple attempts. Your answers were saved but score may not be recorded.');
        }
      }
      
      setFinished({
        correct: result.correct || 0,
        total: result.total || questions.length,
        passed: (result.correct || 0) === (result.total || questions.length),
        recorded: result.recorded || false,
        txHash: result.txHash,
        reason: result.reason,
        error: result.error,
      });
      
      // Celebrate perfect scores
      if (result.correct === result.total) {
        setTimeout(() => {
          setShowCelebration(true);
          triggerCelebration();
        }, 500);
      }
      
    } catch (e: any) {
      console.error('❌ Fatal error in submission:', e);
      
      // Show error to user but don't lose everything
      setFinished({
        correct: 0,
        total: questions.length,
        passed: false,
        recorded: false,
        error: e?.message || 'Failed to submit quiz. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function triggerCelebration() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  function goBackToTournament() {
    if (onNavigate) {
      onNavigate("tournament");
    }
  }

  function goHome() {
    if (onNavigate) {
      onNavigate("home");
    }
  }

  function playAgain() {
    setSessionId(null);
    setFinished(null);
    setAnswers({});
    setSelectedAnswer(null);
    setShowCelebration(false);
    autoSubmitTriggeredRef.current = false;
    setTimeout(() => {
      onStart();
    }, 300);
  }

  const cur = questions[idx];
  
  const progressPct = useMemo(() => {
    if (!questions.length) return 0;
    return ((idx + 1) / questions.length) * 100;
  }, [idx, questions.length]);

  const timerPct = useMemo(() => {
    if (!timeLimit) return 100;
    return Math.max(0, Math.min(100, (remaining / timeLimit) * 100));
  }, [remaining, timeLimit]);

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center mb-2">
        <button 
          onClick={goBackToTournament} 
          className="flex items-center gap-1 text-[#C9E3A8] hover:text-[#94C751] transition-colors mr-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tournaments</span>
        </button>
        <span className="text-highlight/30 mx-2">/</span>
        <span className="text-highlight/80">Tournament #{tournamentId}</span>
      </div>

      {/* ✅ Network status warning */}
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/20 border border-red-500 rounded-xl p-3 flex items-center gap-2"
        >
          <WifiOff className="w-5 h-5 text-red-500" />
          <div>
            <div className="font-semibold text-red-500">No Internet Connection</div>
            <div className="text-sm text-red-500/80">Your answers may not be saved. Please check your connection.</div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <Card className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Medal className="w-5 h-5 text-[#94C751]" />
            <div className="text-lg font-semibold text-[#C9E3A8]">Tournament #{tournamentId}</div>
          </div>
          <div className="text-sm opacity-80">
            {sessionId ? (
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${remaining < timeLimit * 0.2 ? "text-[#ffd166]" : "text-highlight/80"}`} />
                <span className={`font-medium ${remaining < timeLimit * 0.2 ? "text-[#ffd166] animate-pulse" : "text-highlight"}`}>
                  {formattedTime}
                </span>
              </div>
            ) : loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
                <span>Loading...</span>
              </div>
            ) : (
              `Questions: ${qps}`
            )}
          </div>
        </div>

        {!sessionId && !finished && (
          <div className="flex justify-center mt-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <PrimaryButton 
                onClick={onStart} 
                disabled={starting || loading || !info}
                className="px-5 py-2.5"
              >
                {starting ? (
                  <span className="flex items-center">
                    <div className="w-4 h-4 rounded-full border-2 border-[#101707] border-t-transparent animate-spin mr-2"></div>
                    Starting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Start Tournament Quiz
                  </span>
                )}
              </PrimaryButton>
            </motion.div>
          </div>
        )}
      </Card>

      {/* Quiz in Progress */}
      {sessionId && !finished && cur && (
        <Card className="space-y-4">
          {/* Progress and timer bars */}
          <div className="space-y-2">
            {/* Question progress bar */}
            <div className="flex items-center justify-between text-xs text-highlight/70 mb-1">
              <span>Progress</span>
              <span>{idx + 1}/{questions.length}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden border border-secondary/60">
              <motion.div 
                className="h-1.5 bg-[#94C751]"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            
            {/* Timer bar */}
            <div className="flex items-center justify-between text-xs text-highlight/70 mt-2 mb-1">
              <span>Time Remaining</span>
              <span className={remaining <= 10 ? "text-[#ffd166] font-medium animate-pulse" : ""}>{formattedTime}</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden border border-secondary/60">
              <motion.div 
                className={`h-1.5 ${timerPct < 20 ? "bg-[#ffd166]" : "bg-[#94C751]"}`}
                initial={{ width: "100%" }}
                animate={{ width: `${timerPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            
            {/* Warning message when time is low */}
            {remaining <= 10 && remaining > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-[#ffd166] text-sm font-medium mt-2 p-2 bg-[#ffd166]/10 rounded-lg border border-[#ffd166]/30"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Time running out! Quiz will auto-submit in {remaining}s.</span>
              </motion.div>
            )}
          </div>
          
          {/* Question with animations */}
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.questionId}
              initial={{ opacity: 0, x: questionTransition ? 20 : 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-5 rounded-xl bg-[#1c2a0c] border border-[#587E28]/60"
            >
              <div className="font-medium text-[#C9E3A8] text-lg mb-4">
                {cur.text}
              </div>
              <div className="space-y-3">
                {cur.options.map((o, index) => (
                  <motion.button
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.1 }}
                    onClick={() => pickOption(cur.questionId, o.id)}
                    disabled={submitting}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 ${
                      selectedAnswer === o.id 
                        ? "border-[#94C751] bg-[#263711] text-[#C9E3A8]" 
                        : "border-[#587E28] bg-[#1c2a0c] text-[#C9E3A8] hover:bg-[#263711]"
                    } ${submitting ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {o.text}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Manual Submit button */}
          <div className="flex justify-end">
            <button
              onClick={onSubmitAll}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {submitting ? (
                <span className="flex items-center">
                  <div className="w-4 h-4 rounded-full border-2 border-[#101707] border-t-transparent animate-spin mr-2"></div>
                  Submitting...
                </span>
              ) : (
                "Submit All Answers"
              )}
            </button>
          </div>
        </Card>
      )}

      {/* Enhanced Results Display */}
      {finished && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="space-y-4">
              <div className="text-lg font-semibold text-[#C9E3A8] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#94C751]" />
                Tournament Results
              </div>
              
              <div className={`p-6 rounded-xl border ${finished.correct === finished.total ? 'border-[#94C751]' : 'border-[#587E28]'} overflow-hidden relative`}
                style={{ 
                  background: finished.correct === finished.total 
                    ? 'linear-gradient(135deg, #587E28, #94C751)' 
                    : 'linear-gradient(135deg, #263711, #3b5119)' 
                }}
              >
                {/* Celebration elements */}
                {showCelebration && finished.correct === finished.total && (
                  <>
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1, rotate: [0, 15, -15, 0] }}
                      transition={{ duration: 0.8 }}
                      className="absolute top-4 right-4"
                    >
                      <Trophy className="w-12 h-12 text-[#FFD700]" />
                    </motion.div>
                    
                    <motion.div 
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.2, 0.8],
                        y: [-20, 0, 20] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 2,
                        repeatType: "loop" 
                      }}
                      className="absolute -top-2 left-10 text-3xl"
                    >
                      🎉
                    </motion.div>
                    
                    <motion.div 
                      animate={{ 
                        opacity: [0, 1, 0],
                        scale: [0.5, 1.2, 0.8],
                        y: [-10, 5, 20] 
                      }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 1.7,
                        delay: 0.5,
                        repeatType: "loop" 
                      }}
                      className="absolute -bottom-2 right-10 text-3xl"
                    >
                      🎊
                    </motion.div>
                  </>
                )}
                
                {/* Score display */}
                <div className="text-center">
                  <div className="text-2xl font-bold mb-3 text-background">
                    {finished.correct === finished.total 
                      ? '🏆 Perfect Score!' 
                      : '👍 Good Effort!'}
                  </div>
                  
                  <div className="text-4xl font-extrabold text-background mb-3">
                    {finished.correct}/{finished.total}
                  </div>
                  
                  <div className="text-background/90 text-lg">
                    {finished.correct} points earned
                  </div>
                </div>
              </div>
              
              {/* Transaction details */}
              {finished.recorded ? (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#94C751]/10 border border-[#94C751]/30 text-[#C9E3A8]">
                  <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#94C751]" />
                  <div>
                    <div className="font-semibold">Score recorded on-chain! ✅</div>
                    {finished.txHash && (
                      <a 
                        href={`https://celoscan.io/tx/${finished.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm opacity-80 hover:underline break-all text-[#C9E3A8]/80"
                      >
                        View transaction: {finished.txHash.slice(0, 10)}...{finished.txHash.slice(-8)}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-[#ffd166]/10 border border-[#ffd166]/30 text-[#ffd166]">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">
                      {finished.error ? 'Submission Issue' : 'Score not recorded'}
                    </div>
                    {finished.reason && <div className="text-sm opacity-80">{finished.reason}</div>}
                    {finished.error && <div className="text-sm opacity-80">{finished.error}</div>}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <button
                  onClick={goBackToTournament}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-secondary/60 text-highlight hover:bg-secondary/40 transition-all duration-200 flex-1"
                >
                  <Medal className="w-4 h-4" />
                  Tournament Dashboard
                </button>
                
                <button
                  onClick={playAgain}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] transition-all duration-200 flex-1"
                >
                  <Trophy className="w-4 h-4" />
                  Play Again
                </button>
              </div>
            </Card>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}