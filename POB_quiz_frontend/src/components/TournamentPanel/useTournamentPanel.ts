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
import { getDailyPlays, incDailyPlays, loadRegistered, saveRegistered } from "./storage";
import { getTournamentPhase } from "./helpers";

type ToastState = { message: string; type: "success" | "error" | "info"; visible: boolean };

export default function useTournamentPanel(address?: `0x${string}` | null) {
  const [tournamentId, setTournamentId] = useState<number>(ENV_TID);
  const [allTournaments, setAllTournaments] = useState<any[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [board, setBoard] = useState<{ players: string[]; scores: number[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [passes, setPasses] = useState(1);
  const [activeTab, setActiveTab] = useState<"browse" | "details" | "leaderboard" | "admin">("browse");
  const [toast, setToast] = useState<ToastState>({ message: "", type: "info", visible: false });
  const [creating, setCreating] = useState(false);
  const [adminMsg, setAdminMsg] = useState("");
  const [resolutionInfo, setResolutionInfo] = useState<any>(null);

  const [filterMode, setFilterMode] = useState<"all" | "active" | "mine">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTournamentId, setExpandedTournamentId] = useState<number | null>(null);

  const [entryFeeCUSD, setEntryFeeCUSD] = useState<string>("1");
  const [regMinutes, setRegMinutes] = useState<number>(60);
  const [playMinutes, setPlayMinutes] = useState<number>(120);
  const [questionsPerSession, setQuestionsPerSession] = useState<number>(10);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(30);

  const [registeredIds, setRegisteredIds] = useState<number[]>([]);

  const MAX_DAILY_PLAYS = 2;

  const now = Math.floor(Date.now() / 1000);
  const stage: "register" | "play" | "ended" | "unknown" = useMemo(() => {
    if (!info) return "unknown";
    if (now < info.registrationEndTime) return "register";
    if (now >= info.startTime && now <= info.endTime) return "play";
    if (now > info.endTime) return "ended";
    return "unknown";
  }, [info, now]);

  const isOwner =
    !!address && !!HOUSE_ADDRESS && address.toLowerCase() === HOUSE_ADDRESS.toLowerCase();

  function showToast(message: string, type: ToastState["type"] = "info") {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  }

  function sortAndFilter(tournaments: any[]) {
    const currentTime = Math.floor(Date.now() / 1000);
    const withSearch =
      searchQuery.trim() === ""
        ? tournaments
        : tournaments.filter(
            (t) =>
              t.id.toString().includes(searchQuery.toLowerCase()) ||
              (t.description || "").toLowerCase().includes(searchQuery.toLowerCase())
          );

    let filtered = withSearch;
    if (filterMode === "active") {
      filtered = withSearch.filter((t) => currentTime >= t.startTime && currentTime <= t.endTime);
    } else if (filterMode === "mine") {
      filtered = withSearch.filter(
        (t) =>
          t.registered === true ||
          registeredIds.includes(t.id) ||
          (t.id === tournamentId && me?.registered === true)
      );
    }

    const phasePriority = (t: any) => {
      const p = getTournamentPhase(t);
      return p === "active" ? 0 : p === "register" ? 1 : 2;
    };

    return [...filtered].sort((a, b) => {
      const pa = phasePriority(a);
      const pb = phasePriority(b);
      if (pa !== pb) return pa - pb;
      return b.id - a.id;
    });
  }

  async function sendTx(tx: any) {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("No wallet found");
    tx.from ||= address;
    const hash = await eth.request({ method: "eth_sendTransaction", params: [tx] });
    return hash as string;
  }

  async function ensureAllowance(spender: string, neededWei: bigint) {
    if (!address) throw new Error("Connect wallet first");
    const { allowance } = await getCusdAllowance(address, spender);
    const current = BigInt(allowance || "0");
    if (current >= neededWei) return;
    const { tx: approveTx } = await buildCusdApproveTx(spender, neededWei.toString(), address);
    await sendTx(approveTx);
  }

  function markRegistered(id: number) {
    setAllTournaments((prev) => prev.map((t) => (t.id === id ? { ...t, registered: true } : t)));
    if (address) {
      saveRegistered(address, id);
      const next = loadRegistered(address);
      setRegisteredIds(next);
    }
    if (id === tournamentId) {
      setMe((m: any) => ({ ...(m || {}), registered: true }));
    }
  }

  async function onRegister() {
    if (!address) return showToast("Please connect your wallet first", "error");
    if (!info?.contract || !info?.entryFee) return showToast("Tournament not loaded", "error");
    try {
      setBusy(true);
      const feeWei = BigInt(info.entryFee);
      await ensureAllowance(info.contract, feeWei);
      const { tx } = await buildRegisterTx(tournamentId, address);
      await sendTx(tx);
      markRegistered(tournamentId);
      showToast("Successfully registered for tournament!", "success");
      await refresh();
    } catch (e: any) {
      showToast(e?.message || "Registration failed", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onBuyPasses(count: number) {
    if (!address) return showToast("Please connect your wallet first", "error");
    if (!info) return showToast("Tournament not loaded", "error");
    if (!me?.registered) return showToast("You must be registered for this tournament", "error");
    if (stage !== "play") return showToast("Passes can only be bought during the active phase", "error");
    if (count <= 0) return showToast("Enter a valid number of passes", "error");

    try {
      setBusy(true);
      const entryFeeWei = BigInt(info.entryFee);
      const passPct = BigInt(info.passCostPercent || 100); // 1% default
      if (passPct <= 0n) throw new Error("Bad pass cost percent from backend");
      const totalCostWei = (entryFeeWei * BigInt(count)) / passPct;

      const { allowance } = await getCusdAllowance(address, info.contract);
      if (BigInt(allowance || "0") < totalCostWei) {
        showToast("Approval needed. Please confirm in your wallet…", "info");
        const { tx: approveTx } = await buildCusdApproveTx(info.contract, totalCostWei.toString(), address);
        await sendTx(approveTx);
        showToast("Approval successful! Processing purchase…", "success");
      }

      const { tx } = await buildBuyPassesTx(count, tournamentId, address);
      await sendTx(tx);
      showToast(`Successfully bought ${count} pass${count > 1 ? "es" : ""}!`, "success");
      await refresh();
    } catch (e: any) {
      const msg = e?.message || "Failed to buy passes";
      showToast(msg.includes("user rejected") ? "Transaction cancelled" : msg, "error");
    } finally {
      setBusy(false);
    }
  }

  /** ✅ Explicit ID version to avoid async state race */
  function onPlayClick(
    cb?: (id: number) => void,
    dailyUsed?: number,
    dailyLimit?: number,
    explicitTournamentId?: number
  ) {
    const id = explicitTournamentId ?? tournamentId;
    if (!address) {
      showToast("Please connect your wallet first", "error");
      return;
    }
    if (!id || id <= 0) {
      showToast("Select a tournament to play", "error");
      return;
    }

    const used = dailyUsed ?? getDailyPlays(address, id);
    const limit = dailyLimit ?? MAX_DAILY_PLAYS;

    if (used >= limit) {
      showToast("Daily play limit reached for this tournament", "error");
      return;
    }

    incDailyPlays(address, id);
    cb?.(id);
  }

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
      if (!entryFeeNum || regSec <= 0 || playSec <= 0 || qps <= 0 || tpq <= 0) {
        throw new Error("Please fill all fields with valid values.");
      }
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
      await loadAll();
      setActiveTab("browse");
    } catch (e: any) {
      showToast(e?.message || "Failed to create tournament", "error");
    } finally {
      setCreating(false);
    }
  }

  async function onResolve() {
    if (!isOwner) return showToast("Only the house wallet can resolve", "error");
    try {
      setBusy(true);
      setAdminMsg("");
      const { tx } = await buildResolveTournamentTx(tournamentId, address);
      await sendTx(tx);
      showToast("Tournament resolved successfully!", "success");
      await refresh();
    } catch (e: any) {
      setAdminMsg(e?.message || String(e));
      showToast(e?.message || "Failed to resolve", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onSettle() {
    if (!isOwner) return showToast("Only the house wallet can settle", "error");
    try {
      setBusy(true);
      setAdminMsg("");
      const { tx } = await buildSettleTournamentTx(tournamentId, address);
      await sendTx(tx);
      showToast("Tournament settled successfully!", "success");
      await refresh();
    } catch (e: any) {
      setAdminMsg(e?.message || String(e));
      showToast(e?.message || "Failed to settle", "error");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setInfo(null);
    setBoard(null);
    setResolutionInfo(null);

    try {
      const i = await getTournamentInfo(tournamentId);
      setInfo(i);
      setResolutionInfo(explainResolutionAbility(i));
    } catch (e: any) {
      showToast(e?.message || "Failed to load tournament", "error");
      return;
    }

    try {
      const [m, lb] = await Promise.all([
        getTournamentMe(tournamentId, address).catch(() => null),
        getTournamentLeaderboard(tournamentId, 10).catch(() => null),
      ]);

      if (m) {
        setMe(m);
        if (m.registered) markRegistered(tournamentId);
      }
      if (lb) setBoard(lb);
    } catch {
      // ok
    }
  }

  async function loadAll() {
    try {
      setBusy(true);
      const { items } = await listTournaments();
      const augmented =
        items?.map((t: any) => ({
          ...t,
          registered: registeredIds.includes(t.id) || t.registered === true,
        })) ?? [];
      setAllTournaments(augmented);

      if (!tournamentId || tournamentId === 0) {
        const sorted = sortAndFilter(augmented);
        if (sorted.length > 0) setTournamentId(sorted[0].id);
      }
    } catch (e: any) {
      showToast("Failed to load tournaments. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (address) setRegisteredIds(loadRegistered(address));
    else setRegisteredIds([]);
  }, [address]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeredIds]);

  useEffect(() => {
    if (tournamentId > 0) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, address]);

  return {
    tournamentId,
    setTournamentId,
    allTournaments,
    info,
    me,
    board,
    busy,
    passes,
    setPasses,
    activeTab,
    setActiveTab,
    filterMode,
    setFilterMode,
    searchQuery,
    setSearchQuery,
    expandedTournamentId,
    setExpandedTournamentId,
    toast,
    setToast,
    creating,
    adminMsg,
    resolutionInfo,
    entryFeeCUSD,
    setEntryFeeCUSD,
    regMinutes,
    setRegMinutes,
    playMinutes,
    setPlayMinutes,
    questionsPerSession,
    setQuestionsPerSession,
    timePerQuestion,
    setTimePerQuestion,
    isOwner,
    stage,
    showToast,
    refresh,
    loadAll,
    onRegister,
    onBuyPasses,
    onPlayClick, // explicit id capable
    onCreateTournament,
    onResolve,
    onSettle,
    MAX_DAILY_PLAYS,
  };
}
