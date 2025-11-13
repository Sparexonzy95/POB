import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useMiniPay from "../hooks/useMiniPay";
import useCusdBalance from "../hooks/useCusdBalance";
import useGameStats from "../hooks/useGameStats";
import { getState, getCredits } from "../lib/api";
import { getTournamentMe, listTournaments, TOURNAMENT_ID as DEFAULT_TOURNAMENT_ID } from "../lib/tournament";

type Addr = `0x${string}` | null;

type AppState = {
  address: Addr;
  setAddress: (a: Addr) => void;

  credits: number;
  setCredits: (n: number) => void;

  state: any;

  isLoading: boolean;

  // tournaments
  tournamentPasses?: number;
  tournamentPassesLoading: boolean;
  activeTournaments: any[];
  tournamentsWithPasses: number[];
  playingTournamentId: number;
  setPlayingTournamentId: (id: number) => void;

  // balances / stats
  balance: string;
  symbol: string;
  balanceLoading: boolean;
  refreshStats?: () => void;

  // env
  isMiniPayBrowser: boolean;

  // actions
  refreshAll: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<Addr>(null);
  const [credits, setCredits] = useState(0);
  const [state, setState] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [tournamentPasses, setTournamentPasses] = useState<number | undefined>(undefined);
  const [tournamentPassesLoading, setTournamentPassesLoading] = useState(false);
  const [activeTournaments, setActiveTournaments] = useState<any[]>([]);
  const [tournamentsWithPasses, setTournamentsWithPasses] = useState<number[]>([]);
  const [playingTournamentId, setPlayingTournamentId] = useState<number>(DEFAULT_TOURNAMENT_ID);

  const isMiniPayBrowser = useMiniPay();

  const { balance, symbol, loading: balanceLoading } = useCusdBalance(address || undefined);
  const { refreshStats } = useGameStats(address);

  async function refreshAll() {
    setIsLoading(true);
    try {
      const s = await getState().catch(() => null);
      setState(s);

      if (!address) {
        setCredits(0);
        setTournamentPasses(undefined);
        setActiveTournaments([]);
        setTournamentsWithPasses([]);
        return;
      }

      // Credits with MiniPay hard-refresh
      let creditsData: { credits: number } = { credits: 0 };
      try {
        if (isMiniPayBrowser) {
          const API_BASE = "/api";
          const url = `${API_BASE}/quiz/user/?address=${address}&_t=${Date.now()}`;
          const resp = await fetch(url, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              "X-Addr": address,
              "X-Force-Refresh": "1",
            },
            cache: "no-store",
          });
          if (!resp.ok) throw new Error(String(resp.status));
          creditsData = await resp.json();
        } else {
          creditsData = await getCredits(address);
        }
      } catch {
        // retry minimal
        try {
          creditsData = await getCredits(address);
        } catch {
          creditsData = { credits: 0 };
        }
      }
      setCredits(creditsData.credits);
      refreshStats?.();

      // Tournaments & passes
      setTournamentPassesLoading(true);
      try {
        const tournamentResponse = await listTournaments();
        const items = tournamentResponse?.items ?? [];

        if (items.length) {
          const now = Math.floor(Date.now() / 1000);
          const active = items.filter((t: any) => now >= t.startTime && now <= t.endTime).slice(0, 2);
          setActiveTournaments(active);

          let totalPasses = 0;
          const withPasses: number[] = [];

          if (isMiniPayBrowser) {
            for (const t of items) {
              try {
                const me = await getTournamentMe(t.id, address);
                const passes = me?.passes || 0;
                if (passes > 0) withPasses.push(t.id);
                totalPasses += passes;
              } catch {}
              await new Promise((r) => setTimeout(r, 300));
            }
          } else {
            const passCounts = await Promise.all(
              items.map((t: any) =>
                getTournamentMe(t.id, address)
                  .then((me) => {
                    const passes = me?.passes || 0;
                    if (passes > 0) withPasses.push(t.id);
                    return passes;
                  })
                  .catch(() => 0)
              )
            );
            totalPasses = passCounts.reduce((a, b) => a + b, 0);
          }

          setTournamentPasses(totalPasses);
          setTournamentsWithPasses(withPasses);
        } else {
          setActiveTournaments([]);
          setTournamentPasses(0);
          setTournamentsWithPasses([]);
        }
      } catch {
        setActiveTournaments([]);
        setTournamentPasses(0);
        setTournamentsWithPasses([]);
      } finally {
        setTournamentPassesLoading(false);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // refresh anytime address changes
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const value: AppState = useMemo(
    () => ({
      address,
      setAddress,
      credits,
      setCredits,
      state,
      isLoading,
      tournamentPasses,
      tournamentPassesLoading,
      activeTournaments,
      tournamentsWithPasses,
      playingTournamentId,
      setPlayingTournamentId,
      balance,
      symbol,
      balanceLoading,
      refreshStats,
      isMiniPayBrowser,
      refreshAll,
    }),
    [
      address, credits, state, isLoading,
      tournamentPasses, tournamentPassesLoading,
      activeTournaments, tournamentsWithPasses,
      playingTournamentId, balance, symbol, balanceLoading,
      refreshStats, isMiniPayBrowser
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppState must be used within AppStateProvider");
  return v;
}
