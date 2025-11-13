import { createContext, useContext } from "react";

export type Stage = "register" | "play" | "ended" | "unknown";
export type ActiveTab = "browse" | "details" | "leaderboard" | "admin";

export type TournamentState = {
  // external props
  address?: `0x${string}` | null;
  onPlay?: (id: number) => void;

  // derived & server data
  tournamentId: number;
  setTournamentId: (id: number) => void;

  allTournaments: any[];
  info: any | null;
  me: any | null;
  board: { players: string[]; scores: number[] } | null;
  stage: Stage;

  // ui + busy
  busy: boolean;
  creating: boolean;
  activeTab: ActiveTab;
  setActiveTab: (t: ActiveTab) => void;
  filterMode: "all" | "active" | "mine";
  setFilterMode: (m: "all" | "active" | "mine") => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  expandedTournamentId: number | null;
  setExpandedTournamentId: (id: number | null) => void;

  // passes & limits
  passes: number;
  setPasses: (n: number) => void;
  dailySessionsInfo: { used: number; limit: number; limitReached: boolean } | null;
  hasReachedDailyLimit: boolean;

  // admin form
  entryFeeCUSD: string;
  setEntryFeeCUSD: (v: string) => void;
  regMinutes: number;
  setRegMinutes: (v: number) => void;
  playMinutes: number;
  setPlayMinutes: (v: number) => void;
  questionsPerSession: number;
  setQuestionsPerSession: (v: number) => void;
  timePerQuestion: number;
  setTimePerQuestion: (v: number) => void;
  isOwner: boolean;

  // actions (exact same behaviors as before)
  forceFullRefresh: () => void;
  loadAllTournaments: () => Promise<void>;
  refresh: () => Promise<void>;
  onRegister: () => Promise<void>;
  onBuyPasses: () => Promise<void>;
  handlePlayClick: () => void;
  onCreateTournament: () => Promise<void>;
  onResolve: () => Promise<void>;
  onSettle: () => Promise<void>;

  // toast
  toast: { message: string; type: "success" | "error" | "info"; visible: boolean };
  showToast: (m: string, t?: "success" | "error" | "info") => void;
  hideToast: () => void;
};

export const TournamentCtx = createContext<TournamentState | null>(null);
export const useTournament = () => {
  const ctx = useContext(TournamentCtx);
  if (!ctx) throw new Error("Tournament context missing");
  return ctx;
};
