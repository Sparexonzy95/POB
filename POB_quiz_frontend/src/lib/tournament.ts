// src/lib/tournament.ts

// Change this to use relative path for proxy compatibility
const API = '/api';

export const TOURNAMENT_ID = Number(import.meta.env.VITE_TOURNAMENT_ID || "1");

// House / owner wallet (lowercased for comparisons)
export const HOUSE_ADDRESS = (import.meta.env.VITE_HOUSE_ADDRESS || "").toLowerCase();

// Detect MiniPay environment
const isMiniPay = typeof window !== 'undefined' && window.navigator.userAgent.includes('MiniPay');

// -------- Types

export type TxPayload = {
  from?: string;
  to: string;
  data: string;
  value?: string; // hex string
  gas?: string;
  gasPrice?: string;
};

export type TournamentInfo = {
  id: number;
  entryFee: string;               // wei string
  registrationEndTime: number;    // epoch seconds
  startTime: number;              // epoch seconds
  endTime: number;                // epoch seconds
  questionsPerSession: number;
  timePerQuestion: number;        // seconds
  settled: boolean;
  totalPool: string;              // wei string
  playerCount: number;
  houseFeePercent?: number;
  passCostPercent?: number;
  contract?: string;              // tournament contract addr
};

export type TournamentMe = {
  registered: boolean;
  passes: number;
  totalPoints: number;
};

export type Leaderboard = {
  id: number;
  players: string[];
  scores: number[];
};

export type ResolveResponse = {
  tx: TxPayload;
  action: "cancelTournament" | "settleTournament";
  mode: "refund-prestart" | "refund-single-player" | "settle" | "settle-empty";
  note?: string;
};

// PERIOD-BASED create() params expected by backend/contract
export type CreateTournamentParams = {
  entryFeeCUSD: number;          // human cUSD, e.g. 1.5
  registrationPeriodSec: number; // seconds
  playPeriodSec: number;         // seconds
  questionsPerSession: number;
  timePerQuestion: number;       // seconds
};

// -------- Internal fetch helper with MiniPay optimizations

async function jfetch<T = any>(
  path: string,
  opts: RequestInit = {},
  addr?: `0x${string}` | null
): Promise<T> {
  // Add cache-busting for MiniPay
  let finalPath = path;
  if (isMiniPay) {
    const timestamp = Date.now();
    const separator = path.includes('?') ? '&' : '?';
    finalPath = `${path}${separator}_t=${timestamp}`;
    console.log(`MiniPay tournament request: ${API}${finalPath}`);
  }

  // Set up headers with cache control for MiniPay
  const base: Record<string, string> = { 
    "Content-Type": "application/json",
    // Add cache control headers for MiniPay
    ...(isMiniPay ? {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'X-MiniPay-Client': '1'
    } : {})
  };
  
  if (addr) base["X-Addr"] = addr;

  const headers: Record<string, string> = {
    ...base,
    ...(opts.headers as Record<string, string> | undefined),
  };

  // Add cache option for MiniPay
  const fetchOptions = {
    ...opts, 
    headers,
    ...(isMiniPay ? { cache: 'no-store' as RequestCache } : {})
  };

  try {
    const res = await fetch(`${API}${finalPath}`, fetchOptions);

    let parsed: any = null;
    try {
      parsed = await res.json();
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      const msg =
        parsed?.error ||
        (typeof parsed === "string" ? parsed : "") ||
        (await res.text().catch(() => "")) ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    // Log response for MiniPay debugging
    if (isMiniPay) {
      console.log(`Tournament API response:`, parsed);
    }

    return parsed as T;
  } catch (error) {
    console.error(`Tournament API error (${path}):`, error);
    
    // Retry once for MiniPay
    if (isMiniPay) {
      console.log('Retrying tournament request once...');
      try {
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const retryTimestamp = Date.now();
        const separator = path.includes('?') ? '&' : '?';
        const retryPath = `${path}${separator}_retry=${retryTimestamp}`;
        
        const res = await fetch(`${API}${retryPath}`, fetchOptions);
        
        let parsed: any = null;
        try {
          parsed = await res.json();
        } catch {
          /* ignore */
        }

        if (!res.ok) {
          throw new Error(`Retry failed: HTTP ${res.status}`);
        }

        console.log(`Tournament API retry succeeded:`, parsed);
        return parsed as T;
      } catch (retryError) {
        console.error('Tournament API retry failed:', retryError);
        
        // For tournament list, return empty array instead of failing
        if (path.includes('tournament/list')) {
          return { items: [] } as T;
        }
      }
    }
    
    // Re-throw the original error
    throw error;
  }
}

// -------- Discovery

export async function getLatestTournament() {
  return jfetch<{ id: number; info?: TournamentInfo }>(`/tournament/latest/`);
}

export async function listTournaments() {
  console.log('Fetching tournaments list...');
  return jfetch<{ items: TournamentInfo[] }>(`/tournament/list/`);
}

/** Resolve a usable tournament id */
export async function resolveLatestTournamentId(id?: number): Promise<number> {
  if (id && id > 0) return id;
  const latest = await getLatestTournament();
  return Number(latest?.id || 0);
}

// -------- Reads

export async function getTournamentInfo(id = TOURNAMENT_ID) {
  return jfetch<TournamentInfo>(`/tournament/${id}/info/`);
}

export async function getTournamentMe(id = TOURNAMENT_ID, addr?: `0x${string}` | null) {
  if (!addr) return null;
  return jfetch<TournamentMe>(`/tournament/${id}/me/?address=${addr}`);
}

export async function getTournamentLeaderboard(id = TOURNAMENT_ID, n = 10) {
  return jfetch<Leaderboard>(`/tournament/${id}/leaderboard/?top=${n}`);
}

// -------- Tx builders

export async function buildRegisterTx(id = TOURNAMENT_ID, addr?: `0x${string}` | null) {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch<{ tx: TxPayload }>(`/tournament/${id}/register/`, { method: "POST" }, addr);
}

export async function buildBuyPassesTx(
  amount: number,
  id = TOURNAMENT_ID,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch<{ tx: TxPayload }>(
    `/tournament/${id}/passes/`,
    { method: "POST", body: JSON.stringify({ amount }) },
    addr
  );
}

export async function buildCreateTournamentTx(
  params: CreateTournamentParams,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect the house wallet first");
  return jfetch<{ tx: TxPayload }>(
    `/tournament/create/`,
    { method: "POST", body: JSON.stringify(params) },
    addr
  );
}

/** Unified resolver (recommended) - now handles single-player refunds */
export async function buildResolveTournamentTx(
  id = TOURNAMENT_ID,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect the house wallet first");
  return jfetch<ResolveResponse>(
    `/tournament/${id}/resolve/`,
    { method: "POST" },
    addr
  );
}

/** Explicit settle - now handles single-player refunds automatically */
export async function buildSettleTournamentTx(
  id = TOURNAMENT_ID,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect the house wallet first");
  return jfetch<{ tx: TxPayload; fn?: string; note?: string }>(
    `/tournament/${id}/settle/`,
    { method: "POST" },
    addr
  );
}

export async function buildRefundTournamentTx(
  id = TOURNAMENT_ID,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect the house wallet first");
  return jfetch<{ tx: TxPayload; fn?: string }>(
    `/tournament/${id}/refund/`,
    { method: "POST" },
    addr
  );
}

// -------- ERC20 helpers

export async function getCusdAllowance(owner: string, spender: string) {
  return jfetch<{ allowance: string }>(`/erc20/allowance/?owner=${owner}&spender=${spender}`);
}

export async function buildCusdApproveTx(
  spender: string,
  amountWei: string | number,
  addr?: `0x${string}` | null
) {
  if (!addr) throw new Error("Connect wallet first");
  return jfetch<{ tx: TxPayload }>(
    `/erc20/approve/`,
    { method: "POST", body: JSON.stringify({ spender, amountWei }) },
    addr
  );
}

// -------- Small helpers

export function isOwnerAddr(addr?: string | null) {
  return !!addr && !!HOUSE_ADDRESS && addr.toLowerCase() === HOUSE_ADDRESS;
}

/** 
 * Explain what admin action is allowed with the upgraded ABI
 * Now supports single-player refunds via settleTournament
 */
export function explainResolutionAbility(info?: TournamentInfo) {
  if (!info) return { canResolve: false, reason: "No tournament loaded" };

  const now = Math.floor(Date.now() / 1000);
  const started = now >= info.startTime;
  const ended = now > info.endTime;

  if (!started) {
    return { 
      canResolve: true, 
      action: "cancelTournament", 
      reason: "Pre-start: can refund by cancel" 
    };
  }
  
  if (started && !ended) {
    return { 
      canResolve: false, 
      reason: "Tournament in progress" 
    };
  }
  
  // After end - contract now handles all cases including single player
  if (info.playerCount === 0) {
    return { 
      canResolve: true, 
      action: "settleTournament", 
      reason: "Ended with 0 players: can mark as settled" 
    };
  } else if (info.playerCount === 1) {
    return { 
      canResolve: true, 
      action: "settleTournament", 
      reason: "Ended with 1 player: contract will auto-refund via settleTournament" 
    };
  } else {
    return { 
      canResolve: true, 
      action: "settleTournament", 
      reason: `Ended with ${info.playerCount} players: can settle and distribute prizes` 
    };
  }
}

// -------- Tournament Quiz Sessions (NEW) --------

export async function startTournamentSession(
  tournamentId: number,
  address: string
) {
  return jfetch<{
    sessionId: number;
    tournamentId: number;
    timeLimit: number;
    expiresAt: string;
    questions: Array<{
      order: number;
      questionId: number;
      text: string;
      difficulty: string;
      category: string;
      options: Array<{ id: number; text: string }>;
    }>;
    passesRemaining: number;
  }>(
    `/tournament/session/start/`,
    { method: "POST", body: JSON.stringify({ tournamentId }) },
    address
  );
}

export async function finishTournamentSession(
  sessionId: number,
  tournamentId: number,
  address: string
) {
  return jfetch<{
    correct: number;
    total: number;
    points: number;
    recorded: boolean;
    txHash?: string;
    tournamentId?: number;
    passesRemaining?: number;
    reason?: string;
    error?: string;
  }>(
    `/tournament/session/finish/`,
    { method: "POST", body: JSON.stringify({ sessionId, tournamentId }) },
    address
  );
}