// hooks/useGameStats.ts
import { useState, useEffect, useCallback } from 'react';

interface GameStats {
  played: number;
  won: number;
  winRate: number;
  totalEarnings: number;
}

export default function useGameStats(address: `0x${string}` | null | undefined) {
  const [stats, setStats] = useState<GameStats>({
    played: 0,
    won: 0,
    winRate: 0,
    totalEarnings: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);

  const fetchStats = useCallback(async () => {
    if (!address) return;
    
    setIsLoading(true);
    try {
      // Add timestamp and custom headers to force fresh data
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const isMiniPayBrowser = window.navigator.userAgent.includes('MiniPay');
      
      let url = `/api/quiz/stats?address=${address}&_t=${timestamp}&_r=${randomStr}`;
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Addr': address
      };
      
      if (isMiniPayBrowser) {
        headers['X-Force-Refresh'] = '1';
      }
      
      console.log('Fetching game stats...');
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`Stats API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      console.log('Fetched stats:', data);
      
      if (data) {
        const played = data.played || 0;
        const won = data.won || 0;
        setStats({
          played,
          won,
          winRate: played > 0 ? Math.round((won / played) * 100) : 0,
          totalEarnings: data.totalEarnings || 0,
        });
      }
    } catch (error) {
      console.error('Failed to fetch game stats:', error);
    } finally {
      setIsLoading(false);
      setLastRefreshTime(Date.now());
    }
  }, [address]);

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [address, fetchStats]);

  // Function to manually refresh stats
  const refreshStats = useCallback(() => {
    // Don't refresh more often than every 2 seconds to avoid hammering the API
    if (Date.now() - lastRefreshTime < 2000) {
      return Promise.resolve();
    }
    return fetchStats();
  }, [fetchStats, lastRefreshTime]);

  return { stats, isLoading, refreshStats };
}