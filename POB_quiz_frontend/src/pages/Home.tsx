// src/pages/Home.tsx
import { motion } from "framer-motion";
import {
  Calendar,
  PlayCircle,
  Trophy,
  AlertTriangle,
  CreditCard,
  Ticket,
  Coins,
  RefreshCcw,
} from "lucide-react";
import MiniPayDebug from "../components/MiniPayDebug";
import { useAppState } from "../context/AppStateProvider";

export function Home({
  today,
  goQuiz,
  goTournament,
  goBuy, // ✅ new prop
}: {
  today: string;
  goQuiz: () => void;
  goTournament: () => void;
  goBuy: () => void; // ✅ new prop
}) {
  const {
    address,
    credits,
    balance,
    symbol,
    balanceLoading,
    refreshAll,
    tournamentPasses,
    tournamentPassesLoading,
    tournamentsWithPasses,
    isMiniPayBrowser,
  } = useAppState();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="rounded-3xl p-6 shadow-lg border border-secondary/60 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #587E28, #94C751)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-white -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white translate-x-1/2 translate-y-1/2" />
        </div>
        <div className="text-xs text-background/80 mb-2 flex items-center">
          <Calendar className="w-3 h-3 mr-1" />
          {today}
        </div>
        <h1 className="text-3xl font-extrabold text-background drop-shadow-sm">
          Proof of Brain
        </h1>
        <p className="mt-2 text-lg/6 text-background/90">
          Test your knowledge and earn cUSD!
        </p>
        <div className="mt-6 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goQuiz}
            className="px-6 py-3.5 rounded-2xl bg-background text-primary font-semibold shadow-soft inline-flex items-center gap-2"
          >
            <PlayCircle className="w-5 h-5" /> Play Quiz
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={goTournament}
            className="px-6 py-3.5 rounded-2xl bg-background/70 text-highlight font-semibold border border-secondary/60 inline-flex items-center gap-2"
          >
            <Trophy className="w-5 h-5" /> Tournaments
          </motion.button>
        </div>
      </section>

      {/* MiniPay force refresh fab (only in MiniPay) */}
      {isMiniPayBrowser && (
        <div className="fixed bottom-20 left-4 z-50">
          <button
            onClick={() => {
              localStorage.removeItem("lastRefresh");
              refreshAll();
            }}
            className="bg-[#94C751] text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
            title="Force refresh data"
          >
            <RefreshCcw className="w-6 h-6" />
          </button>
        </div>
      )}

      <MiniPayDebug />

      {/* Resources */}
      <section className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft">
        <div className="bg-[#2D4014] px-4 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-[#94C751]">Your Resources</div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshAll}
            className="text-xs px-2 py-1 rounded-lg bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 inline-flex items-center gap-1"
          >
            <RefreshCcw className="w-3 h-3" /> Refresh
          </motion.button>
        </div>
        <div className="bg-surface p-4">
          {!address ? (
            <div className="text-sm text-[#ffd166] bg-[#ffd166]/10 rounded-lg p-3 border border-[#ffd166]/30 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>Connect your wallet to see your resources and play games.</div>
            </div>
          ) : (
            <>
              <div className="text-xs opacity-70 mb-1">Wallet Address</div>
              <div className="text-xs break-all text-[#EAF9D5] mb-3 truncate-address">
                {address}
              </div>

              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 mr-2 text-[#94C751]" />
                  <span className="opacity-70">Quiz Credits</span>
                </div>
                <div className="text-right font-semibold">{credits}</div>

                <div className="flex items-center">
                  <Ticket className="w-4 h-4 mr-2 text-[#94C751]" />
                  <span className="opacity-70">Tournament Passes</span>
                </div>
                <div className="text-right font-semibold">
                  {tournamentPassesLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin ml-auto" />
                  ) : (
                    <div className="flex items-center justify-end">
                      {tournamentPasses ?? "..."}
                      {tournamentsWithPasses.length > 0 && (
                        <span className="ml-2 text-xs opacity-60">
                          (across {tournamentsWithPasses.length} tournaments)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <Coins className="w-4 h-4 mr-2 text-[#94C751]" />
                  <span className="opacity-70">cUSD Balance</span>
                </div>
                <div className="text-right font-semibold">
                  {balanceLoading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin ml-auto" />
                  ) : (
                    `${balance} ${symbol}`
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Play options */}
      <section className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft">
        <div className="bg-[#2D4014] px-4 py-3">
          <div className="text-sm font-semibold text-[#94C751]">Play Options</div>
        </div>
        <div className="bg-surface divide-y divide-secondary/10">
          {/* Quick Quiz */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-[#94C751]"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" />
              </svg>
              <div className="font-medium">Quick Quiz</div>
            </div>
            <div className="text-xs text-highlight/70 mb-2">
              Answer 10 questions in 20 seconds to win 1.8× your entry fee.
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                0.01 cUSD entry
              </div>
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                20 sec time limit
              </div>
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                Need 10/10 correct
              </div>
            </div>
            <button
              onClick={credits > 0 ? goQuiz : goBuy} // ✅ route to Buy when no credits
              className={`w-full px-4 py-2 rounded-xl text-sm font-medium ${
                credits > 0
                  ? "bg-[#94C751] text-[#101707] hover:bg-[#C9E3A8]"
                  : "bg-[#FF9500] text-[#101707] hover:bg-[#FFB74D]"
              }`}
            >
              {credits > 0
                ? `Play (${credits} credit${credits !== 1 ? "s" : ""})`
                : "Buy Credits"}
            </button>
          </div>

          {/* Tournaments */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#94C751]" />
              <div className="font-medium">Tournaments</div>
            </div>
            <div className="text-xs text-highlight/70 mb-2">
              Compete with other players for the prize pool. Top 3 players win
              rewards.
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                Passes required
              </div>
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                Max 2 plays/day
              </div>
              <div className="text-xs bg-[#2D4014] px-2 py-0.5 rounded">
                Leaderboard rankings
              </div>
            </div>
            <button
              onClick={goTournament}
              className="w-full px-4 py-2 rounded-xl text-sm border border-[#94C751] text-[#94C751] hover:bg-[#94C751]/20 font-medium"
            >
              View Tournaments
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
