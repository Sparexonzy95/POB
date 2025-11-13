import { motion } from "framer-motion";
import { Brain, Trophy, ShieldCheck } from "lucide-react";

export function How({ goQuiz, goTournament }: { goQuiz: () => void; goTournament: () => void; }) {
  return (
    <div className="space-y-6">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
        className="rounded-2xl p-6 bg-surface border border-secondary/60 shadow-soft space-y-4">
        <div className="text-xl font-bold text-[#94C751]">How Celo Quiz Works</div>

        {/* Quick Quiz */}
        <section>
          <div className="flex items-center gap-2 mb-3"><Brain className="w-5 h-5 text-[#94C751]" /><div className="text-lg font-semibold text-[#C9E3A8]">Quick Quiz</div></div>
          <div className="space-y-3 text-sm">
            <p>Fast paced knowledge challenge with instant cUSD rewards.</p>
            <ul className="space-y-2 bg-[#263711] rounded-lg p-4 text-highlight/90">
              <li>1) Buy credits (0.01 cUSD each)</li>
              <li>2) Answer 10 random questions in 20 seconds</li>
              <li>3) Get ALL correct to win</li>
              <li>4) Payout 1.8× entry fee (after 10% house fee)</li>
            </ul>
            <button onClick={goQuiz} className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-[#94C751] text-[#101707] hover:bg-[#C9E3A8]">Play Quick Quiz</button>
          </div>
        </section>

        {/* Tournaments */}
        <section className="pt-4 border-t border-secondary/20">
          <div className="flex items-center gap-2 mb-3"><Trophy className="w-5 h-5 text-[#94C751]" /><div className="text-lg font-semibold text-[#C9E3A8]">Tournaments</div></div>
          <div className="space-y-3 text-sm">
            <p>Compete for bigger prize pools and leaderboard glory.</p>
            <ul className="space-y-2 bg-[#263711] rounded-lg p-4 text-highlight/90">
              <li>1) Pay entry (min 0.01 cUSD)</li>
              <li>2) Buy passes (1% of entry each)</li>
              <li>3) Up to 2 plays/day</li>
              <li>4) Top 3 win prizes</li>
            </ul>
            <button onClick={goTournament} className="w-full px-4 py-2 rounded-xl text-sm font-medium bg-[#587E28]/80 text-[#EAF9D5] hover:bg-[#587E28]">View Tournaments</button>
          </div>
        </section>

        <section className="pt-4 border-t border-secondary/20">
          <div className="flex items-center gap-2 mb-3"><ShieldCheck className="w-5 h-5 text-[#94C751]" /><div className="text-lg font-semibold text-[#C9E3A8]">Technical</div></div>
          <ul className="space-y-1 text-highlight/80 list-disc list-inside text-sm">
            <li>cUSD stablecoin</li>
            <li>Smart contracts for entries & payouts</li>
            <li>Transparent prize pools</li>
          </ul>
        </section>
      </motion.div>
    </div>
  );
}
