import { motion } from "framer-motion";
import { AlertTriangle, CreditCard, Info, RefreshCcw } from "lucide-react";
import { useAppState } from "../context/AppStateProvider";
import QuizRules from "../components/QuizRules";
import SessionPanel from "../components/SessionPanel";
import GameStats from "../components/GameStats";

export function Quiz({ navigate }: { navigate: (t: any) => void }) {
  const { credits, isLoading, refreshAll, refreshStats } = useAppState();

  return (
    <div className="space-y-5">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
        className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft">
        <div className="bg-[#2D4014] px-4 py-3"><div className="text-sm font-semibold text-[#94C751]">Your Quiz Dashboard</div></div>
        <div className="bg-surface p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs opacity-70 mb-1">Available Credits</div>
              <div className="text-3xl font-bold text-primary">{credits}</div>
            </div>
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, credits))].map((_, i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-[#94C751] flex items-center justify-center text-[#101707] text-xs font-bold shadow-soft">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
              ))}
              {credits === 0 && <div className="text-xs opacity-70">No credits available</div>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={refreshAll} className="flex-1 px-3 py-2 rounded-xl border border-secondary/60 hover:bg-secondary/20 text-sm inline-flex items-center justify-center gap-2">
              {isLoading ? <div className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin" /> : <RefreshCcw className="w-4 h-4" />} Refresh
            </button>
            <button onClick={() => navigate("buy")}
              className={`flex-1 px-3 py-2 rounded-xl text-sm inline-flex items-center justify-center gap-2 ${
                credits === 0 ? "bg-[#94C751] text-[#101707] font-medium shadow-md hover:bg-[#C9E3A8]" : "border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10"
              }`}>
              <CreditCard className="w-4 h-4" /> {credits === 0 ? "Buy Credits" : "Buy More"}
            </button>
          </div>
          {credits === 0 && (
            <div className="text-sm text-[#ffd166] bg-[#ffd166]/10 rounded-lg p-3 border border-[#ffd166]/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>You need at least 1 credit to play. Purchase credits to start a quiz.</div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft">
        <div className="bg-[#2D4014] px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#94C751] flex items-center gap-2"><Info className="w-4 h-4" /> Quiz Rules</div>
          <button onClick={() => navigate("how")} className="text-xs px-2 py-1 rounded-lg bg-[#94C751]/10 text-[#94C751] hover:bg-[#94C751]/20">More Info</button>
        </div>
        <QuizRules />
      </motion.div>

      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <SessionPanel address={useAppState().address} onNavigate={navigate} refreshCredits={useAppState().refreshAll} refreshStats={refreshStats} />
      </motion.div>

      <GameStats address={useAppState().address} />
    </div>
  );
}
