// components/GameStats.tsx
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import useGameStats from '../hooks/useGameStats';
import { RefreshCcw } from 'lucide-react';

export default function GameStats({ address }: { address: `0x${string}` | null | undefined }) {
  const { stats, isLoading, refreshStats } = useGameStats(address);

  // Refresh stats periodically to catch updates
  useEffect(() => {
    if (!address) return;
    
    // Refresh every 30 seconds if the component is mounted
    const interval = setInterval(() => {
      refreshStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [address, refreshStats]);

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden border border-secondary/60 shadow-soft"
    >
      <div className="bg-[#2D4014] px-4 py-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[#94C751]">Your Stats</div>
        <button
          onClick={() => refreshStats()}
          disabled={isLoading}
          className="text-xs px-2 py-1 rounded-lg bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 transition inline-flex items-center gap-1"
        >
          {isLoading ? (
            <div className="w-3 h-3 rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
          ) : (
            <RefreshCcw className="w-3 h-3" />
          )}
          Refresh
        </button>
      </div>
      
      <div className="bg-surface p-4">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-xs opacity-70 mb-1">Quizzes Played</div>
            <div className="text-xl font-semibold text-[#C9E3A8]">
              {isLoading ? (
                <div className="w-4 h-4 mx-auto rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
              ) : (
                stats.played
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs opacity-70 mb-1">Quizzes Won</div>
            <div className="text-xl font-semibold text-[#C9E3A8]">
              {isLoading ? (
                <div className="w-4 h-4 mx-auto rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
              ) : (
                stats.won
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs opacity-70 mb-1">Win Rate</div>
            <div className="text-xl font-semibold text-[#C9E3A8]">
              {isLoading ? (
                <div className="w-4 h-4 mx-auto rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
              ) : (
                `${stats.winRate}%`
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs opacity-70 mb-1">Total Earnings</div>
            <div className="text-xl font-semibold text-[#C9E3A8]">
              {isLoading ? (
                <div className="w-4 h-4 mx-auto rounded-full border-2 border-[#94C751] border-t-transparent animate-spin"></div>
              ) : (
                `${stats.totalEarnings} cUSD`
              )}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-center mt-4 opacity-60">
          {stats.played > 0 ? (
            `Last updated: ${new Date().toLocaleTimeString()}`
          ) : (
            "Play more quizzes to build up your stats!"
          )}
        </div>
      </div>
    </motion.div>
  );
}