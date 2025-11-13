import { useEffect, useMemo, useState } from "react";
import {
  getCusdAllowance,
  buildCusdApproveTx,
  getTournamentInfo,
  getTournamentLeaderboard,
  getTournamentMe,
  buildRegisterTx,
  buildBuyPassesTx,
  buildCreateTournamentTx,
  HOUSE_ADDRESS,
  CreateTournamentParams,
  TOURNAMENT_ID as ENV_TID,
  listTournaments,
  buildResolveTournamentTx,
  buildSettleTournamentTx,
  explainResolutionAbility,
} from "../../lib/tournament";

type Toast = { message: string; type: "success" | "error" | "info"; visible: boolean };

const DAILY_PLAYS_KEY = "tournament_daily_plays";
const REGISTERED_TOURNAMENTS_KEY = "registered_tournaments";

export function useTournamentPanel(address?: `0x${string}` | null, onPlay?: (id: number) => void) {
  const [tournamentId, setTournamentId] = useState<number>(ENV_TID);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [board, setBoard] = useState<{ players: string[]; scores: number[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const [passes, setPasses] = useState(1);
  const [creating, setCreating] = useState(false);

  const [activeTab, setActiveTab] = useState<"browse" | "details" | "leaderboard" | "admin">("browse");
  const [filterMode, setFilterMode] = useState<"all" | "active" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTournamentId, setExpandedTournamentId] = useState<number | null>(null);

  const [toast, setToast] = useState<Toast>({ message: "", type: "info", visible: false });

  const [registeredTournamentIds, setRegisteredTournamentIds] = useState<number[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [dailySessionsInfo, setDailySessionsInfo] = useState<{ used: number; limit: number; limitReached: boolean } | null>(null);

  // admin form
  const [entryFeeCUSD, setEntryFeeCUSD] = useState<string>("1");
  const [regMinutes, setRegMinutes] = useState<number>(60);
  const [playMinutes, setPlayMinutes] = useState<number>(120);
  const [questionsPerSession, setQuestionsPerSession] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30);

  const showToast = (message: string, type: Toast["type"] = "info") =>
    setToast({ message, type, visible: true });
  const hideToast = () => setToast((p) => ({ ...p, visible: false }));

  // helpers (unchanged behavior)
  function loadRegisteredTournamentsFromStorage(walletAddress: string) {
    try {
      const storageKey = `${REGISTERED_TOURNAMENTS_KEY}_${walletAddress.toLowerCase()}`;
      const storedValue = localStorage.getItem(storageKey);
      return storedValue ? JSON.parse(storedValue) : [];
    } catch {
      return [];
    }
  }
  function saveRegisteredTournamentToStorage(walletAddress: string, id: number) {
    try {
      const storageKey = `${REGISTERED_TOURNAMENTS_KEY}_${walletAddress.toLowerCase()}`;
      const list = loadRegisteredTournamentsFromStorage(walletAddress);
      if (!list.includes(id)) {
        localStorage.setItem(storageKey, JSON.stringify([...list, id]));
      }
    } catch {}
  }
  function getDailyPlaysFromLocalStorage(addr: string, tid: number) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const key = `${DAILY_PLAYS_KEY}_${addr.toLowerCase()}_${tid}_${today}`;
      const v = localStorage.getItem(key);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }
  function incrementDailyPlaysInLocalStorage(addr: string, tid: number) {
    try {
      const today = new Date().toISOString().split("T")[0];
      const key = `${DAILY_PLAYS_KEY}_${addr.toLowerCase()}_${tid}_${today}`;
      const cur = getDailyPlaysFromLocalStorage(addr, tid);
      localStorage.setItem(key, String(cur + 1));
    } catch {}
  }
  function updateRegistrationStatus(id: number, isRegistered = true) {
    setAllTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, registered: isRegistered } : t)));
    if (id === tournamentId && isRegistered) setMe((prev: any) => ({ ...prev, registered: true }));
    if (isRegistered && address) {
      if (!registeredTournamentIds.includes(id)) {
        setRegisteredTournamentIds((prev) => [...prev, id]);
        saveRegisteredTournamentToStorage(address, id);
      }
    }
    setRefreshTrigger((p) => p + 1);
  }

  // sorting + filtering (same logic)
  function sortTournamentsByPhase(tournaments: any[], currentTime: number) {
    const q = searchQuery.trim().toLowerCase();
    let arr = [...tournaments];
    if (q) {
      arr = arr.filter(
        (t) =>
          t.id.toString().includes(q) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (filterMode === "active") {
      arr = arr.filter((t) => currentTime >= t.startTime && currentTime <= t.endTime);
    } else if (filterMode === "mine") {
      arr = arr.filter(
        (t) =>
          t.registered === true ||
          registeredTournamentIds.includes(t.id) ||
          (t.id === tournamentId && me?.registered === true)
      );
    }
    const phase = (t: any) =>
      currentTime >= t.startTime && currentTime <= t.endTime ? 0 : currentTime < t.registrationEndTime ? 1 : 2;
    arr.sort((a, b) => (phase(a) - phase(b)) || (b.id - a.id));
    return arr;
  }

  async function fetchDailyLimitInfo() {
    if (!address || !tournamentId) {
      setDailySessionsInfo(null);
      return;
    }
    const MAX = 2;
    try {
      const res = await fetch(`/api/tournament/${tournamentId}/daily-plays/`, { headers: { "X-Addr": address } });
      if (res.ok) {
        const d = await res.json();
        setDailySessionsInfo({ used: d.plays_today, limit: d.max_daily_plays, limitReached: d.limit_reached });
      } else {
        const used = getDailyPlaysFromLocalStorage(address, tournamentId);
        setDailySessionsInfo({ used, limit: MAX, limitReached: used >= MAX });
      }
    } catch {
      const used = getDailyPlaysFromLocalStorage(address, tournamentId);
      setDailySessionsInfo({ used, limit: MAX, limitReached: used >= MAX });
    }
  }

  // network helpers
  async function sendTx(tx: any) {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No wallet found");
    tx.from ||= address;
    return (await eth.request({ method: "eth_sendTransaction", params: [tx] })) as string;
  }
  async function ensureAllowance(spender: string, neededWei: bigint) {
    if (!address) throw new Error("Connect wallet first");
    const { allowance } = await getCusdAllowance(address, spender);
    const cur = BigInt(allowance || "0");
    if (cur >= neededWei) return;
    const { tx } = await buildCusdApproveTx(spender, neededWei.toString(), address);
    await sendTx(tx);
  }

 // Update only the onRegister function in useTournamentPanel.tsx

async function onRegister() {
  if (!address) return showToast("Please connect your wallet first", "error");
  if (!info?.contract || !info?.entryFee) return showToast("Tournament information not loaded", "error");
  
  try {
    setBusy(true);
    const feeWei = BigInt(info.entryFee);
    const tournamentContract = info.contract;
    
    // Step 1: Check current allowance
    showToast("Checking token allowance...", "info");
    const { allowance } = await getCusdAllowance(address, tournamentContract);
    const currentAllowance = BigInt(allowance || "0");
    
    console.log(`Current allowance: ${currentAllowance.toString()}, Required: ${feeWei.toString()}`);
    
    // Step 2: If allowance is insufficient, request approval
    if (currentAllowance < feeWei) {
      showToast("Token approval required. Please confirm the approval transaction in your wallet...", "info");
      
      try {
        // Request a large approval amount to avoid needing approval again
        const approvalAmount = (feeWei * 1000n).toString(); // Approve 1000x the entry fee
        const { tx: approveTx } = await buildCusdApproveTx(tournamentContract, approvalAmount, address);
        
        console.log("Sending approval transaction:", approveTx);
        const approveTxHash = await sendTx(approveTx);
        console.log("Approval transaction sent:", approveTxHash);
        
        showToast("Approval successful! Now registering...", "success");
        
        // Wait a moment for the approval to be mined
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (approvalError: any) {
        console.error("Approval error:", approvalError);
        if (approvalError?.message?.includes("user rejected")) {
          throw new Error("Approval cancelled. You must approve token spending to register.");
        }
        throw new Error(`Approval failed: ${approvalError?.message || "Unknown error"}`);
      }
    } else {
      console.log("Sufficient allowance already exists");
    }
    
    // Step 3: Register for tournament
    showToast("Registering for tournament...", "info");
    const { tx } = await buildRegisterTx(tournamentId, address);
    
    console.log("Sending registration transaction:", tx);
    const registrationTxHash = await sendTx(tx);
    console.log("Registration transaction sent:", registrationTxHash);
    
    // Update state
    updateRegistrationStatus(tournamentId, true);
    showToast("Successfully registered for tournament!", "success");
    
    // Refresh data
    await refresh();
    if (filterMode === "mine") setRefreshTrigger((p) => p + 1);
    
  } catch (e: any) {
    console.error("Registration error:", e);
    
    // Better error messages
    const errorMsg = e?.message || "";
    if (errorMsg.includes("user rejected") || errorMsg.includes("cancelled")) {
      showToast("Transaction cancelled by user", "error");
    } else if (errorMsg.includes("insufficient funds") || errorMsg.includes("exceeds balance")) {
      showToast("Insufficient cUSD balance. You need at least " + (Number(info.entryFee) / 1e18).toFixed(4) + " cUSD", "error");
    } else if (errorMsg.includes("insufficient allowance")) {
      showToast("Token approval failed. Please try again.", "error");
    } else {
      showToast(errorMsg || "Registration failed. Please try again.", "error");
    }
  } finally {
    setBusy(false);
  }
}

  async function onBuyPasses() {
    if (!address) return showToast("Please connect your wallet first", "error");
    if (!info) return showToast("Tournament information not loaded", "error");
    if (!me?.registered) return showToast("You must be registered for this tournament", "error");
    const now = Math.floor(Date.now() / 1000);
    if (!(now >= info.startTime && now <= info.endTime)) return showToast("Passes can only be bought during the active phase", "error");
    if (passes <= 0) return showToast("Please enter a valid number of passes", "error");

    try {
      setBusy(true);
      const entryFeeWei = BigInt(info.entryFee);
      const passPct = BigInt(info.passCostPercent || 100);
      if (passPct <= 0n) throw new Error("Bad pass cost percent from backend");
      const totalCostWei = (entryFeeWei * BigInt(passes)) / passPct;

      const { allowance } = await getCusdAllowance(address, info.contract);
      const current = BigInt(allowance || "0");

      if (current < totalCostWei) {
        showToast("Approval needed. Please confirm the transaction in your wallet...", "info");
        const { tx: approveTx } = await buildCusdApproveTx(info.contract, totalCostWei.toString(), address);
        await sendTx(approveTx);
        showToast("Approval successful! Now processing your purchase...", "success");
      }

      const { tx } = await buildBuyPassesTx(passes, tournamentId, address);
      await sendTx(tx);
      showToast(`Successfully bought ${passes} pass${passes > 1 ? "es" : ""}!`, "success");
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("user rejected")) showToast("Transaction cancelled", "error");
      else if (msg.includes("insufficient allowance")) showToast("Token approval issue. Please try again.", "error");
      else if (msg.includes("insufficient funds")) showToast("You don't have enough cUSD tokens", "error");
      else showToast(msg || "Failed to buy passes", "error");
    } finally {
      setBusy(false);
    }
  }

  function handlePlayClick() {
    if (!address || !tournamentId) return;
    if (dailySessionsInfo && !dailySessionsInfo.limitReached) {
      incrementDailyPlaysInLocalStorage(address, tournamentId);
      setDailySessionsInfo((prev) =>
        prev ? { ...prev, used: prev.used + 1, limitReached: prev.used + 1 >= prev.limit } : prev
      );
    }
    onPlay?.(tournamentId);
  }

  const isOwner = !!address && !!HOUSE_ADDRESS && address.toLowerCase() === HOUSE_ADDRESS.toLowerCase();

  async function onCreateTournament() {
    if (!isOwner) return showToast("Only the house wallet can create tournaments", "error");
    if (!address) return showToast("Please connect the house wallet", "error");
    try {
      setCreating(true);
      const entryFeeNum = Number(entryFeeCUSD || 0);
      const regSec = Math.max(60, Math.round(Number(regMinutes || 0) * 60));
      const playSec = Math.max(60, Math.round(Number(playMinutes || 0) * 60));
      const qps = Number(questionsPerSession || 10);
      const tpq = Number(timePerQuestion || 30);
      if (!entryFeeNum || regSec <= 0 || playSec <= 0 || qps <= 0 || tpq <= 0)
        throw new Error("Please fill all fields with valid positive values.");

      const params: CreateTournamentParams = {
        entryFeeCUSD: entryFeeNum,
        registrationPeriodSec: regSec,
        playPeriodSec: playSec,
        questionsPerSession: qps,
        timePerQuestion: tpq,
      };
      const { tx } = await buildCreateTournamentTx(params, address);
      await sendTx(tx);
      showToast("Tournament created successfully!", "success");
      await loadAllTournaments();
      setActiveTab("browse");
    } catch (e: any) {
      showToast(e?.message || "Failed to create tournament", "error");
    } finally {
      setCreating(false);
    }
  }

  async function onResolve() {
    if (!isOwner) return showToast("Only the house wallet can resolve tournaments", "error");
    try {
      setBusy(true);
      const { tx } = await buildResolveTournamentTx(tournamentId, address);
      await sendTx(tx);
      showToast("Tournament resolved successfully!", "success");
      await refresh();
    } catch (e: any) {
      showToast(e?.message || "Failed to resolve tournament", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onSettle() {
    if (!isOwner) return showToast("Only the house wallet can settle tournaments", "error");
    try {
      setBusy(true);
      const { tx } = await buildSettleTournamentTx(tournamentId, address);
      await sendTx(tx);
      showToast("Tournament settled successfully!", "success");
      await refresh();
    } catch (e: any) {
      showToast(e?.message || "Failed to settle tournament", "error");
    } finally {
      setBusy(false);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const stage: "register" | "play" | "ended" | "unknown" = useMemo(() => {
    if (!info) return "unknown";
    if (now < info.registrationEndTime) return "register";
    if (now >= info.startTime && now <= info.endTime) return "play";
    if (now > info.endTime) return "ended";
    return "unknown";
  }, [info, now]);

  const filteredTournaments = useMemo(() => {
    const currentTime = Math.floor(Date.now() / 1000);
    return sortTournamentsByPhase(allTournaments, currentTime);
  }, [allTournaments, filterMode, searchQuery, registeredTournamentIds, refreshTrigger, me, tournamentId]);

  async function loadAllTournaments() {
    try {
      setBusy(true);
      const { items } = await listTournaments();
      const updated = items?.length
        ? items.map((i: any) => ({
            ...i,
            registered:
              registeredTournamentIds.includes(i.id) || i.registered === true,
          }))
        : [];
      setAllTournaments(updated);
      if (!tournamentId || tournamentId === 0) {
        const currentTime = Math.floor(Date.now() / 1000);
        const sorted = sortTournamentsByPhase(updated, currentTime);
        if (sorted.length) setTournamentId(sorted[0].id);
      }
    } catch (e) {
      showToast("Failed to load tournaments. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setInfo(null);
    setBoard(null);
    try {
      const i = await getTournamentInfo(tournamentId);
      setInfo(i);
      // keep resolution info computed, if you used it elsewhere:
      // const resolution = explainResolutionAbility(i);
      // setResolutionInfo(resolution);
    } catch (e: any) {
      showToast(e?.message || "Failed to load tournament information", "error");
      return;
    }

    try {
      const [m, lb] = await Promise.all([
        getTournamentMe(tournamentId, address).catch(() => null),
        getTournamentLeaderboard(tournamentId, 10).catch(() => null),
      ]);
      if (m) {
        setMe(m);
        if (m.registered) updateRegistrationStatus(tournamentId, true);
      }
      if (lb) setBoard(lb);
      await fetchDailyLimitInfo();
    } catch {
      await fetchDailyLimitInfo();
    }
  }

  function forceFullRefresh() {
    setBusy(true);
    setTimeout(() => {
      loadAllTournaments();
      refresh();
      setBusy(false);
    }, 100);
  }

  const isOwnerMemo = isOwner;
  const hasReachedDailyLimit =
    dailySessionsInfo ? dailySessionsInfo.limitReached : (address ? getDailyPlaysFromLocalStorage(address, tournamentId) >= 2 : false);

  // bootstrap
  useEffect(() => {
    if (address) setRegisteredTournamentIds(loadRegisteredTournamentsFromStorage(address));
    else setRegisteredTournamentIds([]);
  }, [address]);
  useEffect(() => { loadAllTournaments(); }, [registeredTournamentIds]); // eslint-disable-line
  useEffect(() => {
    if (tournamentId > 0) refresh();
  }, [tournamentId, address]); // eslint-disable-line

  return {
    // external
    address, onPlay,

    // data + ui
    tournamentId, setTournamentId,
    allTournaments, filteredTournaments, info, me, board, stage,
    busy, creating,

    activeTab, setActiveTab, filterMode, setFilterMode,
    searchQuery, setSearchQuery,
    expandedTournamentId, setExpandedTournamentId,

    passes, setPasses,
    dailySessionsInfo, hasReachedDailyLimit,

    entryFeeCUSD, setEntryFeeCUSD,
    regMinutes, setRegMinutes,
    playMinutes, setPlayMinutes,
    questionsPerSession, setQuestionsPerSession,
    timePerQuestion, setTimePerQuestion,
    isOwner: isOwnerMemo,

    // actions
    forceFullRefresh, loadAllTournaments, refresh,
    onRegister, onBuyPasses, handlePlayClick,
    onCreateTournament, onResolve, onSettle,

    // toast
    toast, showToast, hideToast,
  };
}