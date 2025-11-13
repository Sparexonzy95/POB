import { ArrowLeft, Hammer, Plus, RotateCcw, ShieldCheck, Wrench } from "lucide-react";

export default function AdminTab({
  state,
  actions,
}: {
  state: {
    isOwner: boolean;
    tournamentId: number;
    info: any;
    stage: "register" | "play" | "ended" | "unknown";
    resolutionInfo: any;
    adminMsg: string;
    creating: boolean;
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
  };
  actions: {
    setActiveTab: (t: "browse" | "details" | "leaderboard" | "admin") => void;
    onCreateTournament: () => void;
    onResolve: () => void;
    onSettle: () => void;
    showToast: (m: string, t?: "success" | "error" | "info") => void;
  };
}) {
  const {
    isOwner,
    tournamentId,
    info,
    stage,
    resolutionInfo,
    adminMsg,
    creating,
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
  } = state;

  const { setActiveTab, onCreateTournament, onResolve, onSettle, showToast } = actions;

  const canSettle = !!info && stage === "ended" && !info.settled && isOwner;
  const showResolve = !!info && isOwner && !info.settled;

  if (!isOwner)
    return (
      <div className="bg-surface rounded-2xl p-8 border border-secondary/30 text-center">
        Only the house wallet can access admin tools.
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30">
        <div className="bg-[#2D4014] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("browse")}
                className="w-8 h-8 rounded-full bg-[#2D4014]/50 flex items-center justify-center"
                title="Back to tournament list"
              >
                <ArrowLeft className="w-4 h-4 text-[#C9E3A8]" />
              </button>
              <ShieldCheck className="w-6 h-6 text-[#94C751]" />
              <h2 className="text-lg font-semibold text-[#C9E3A8]">Tournament Administration</h2>
            </div>

            <button
              onClick={() => {}}
              className="px-3 py-1 rounded-xl bg-[#94C751]/20 text-[#94C751] opacity-60 cursor-default text-sm inline-flex items-center gap-1"
              title="Use the form below"
            >
              <Plus className="w-4 h-4" />
              New Tournament
            </button>
          </div>
        </div>

        <div className="p-6">
          {tournamentId && info ? (
            <div className="bg-[#1c2a0c]/60 rounded-xl p-4 border border-secondary/30 mb-6">
              <div className="text-sm font-medium text-[#C9E3A8] mb-3">Tournament #{tournamentId} Status</div>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <div className="text-xs opacity-70">Phase</div>
                  <div className="mt-1">{stage === "play" ? "Active" : stage === "register" ? "Registration" : "Ended"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Settled</div>
                  <div className="mt-1">{info.settled ? "Yes" : "No"}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Player Count</div>
                  <div className="mt-1">{info.playerCount || 0}</div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Prize Pool (wei)</div>
                  <div className="mt-1">{String(info.totalPool ?? 0)}</div>
                </div>
              </div>

              {resolutionInfo && !info.settled && (
                <div
                  className={`flex items-start gap-2 text-xs p-3 rounded-lg mb-4 ${
                    resolutionInfo.canResolve ? "bg-[#94C751]/10 border border-[#94C751]/30" : "bg-[#F7D07A]/10 border border-[#F7D07A]/30"
                  }`}
                >
                  <div className={resolutionInfo.canResolve ? "text-[#C9E3A8]" : "text-[#F7D07A]"}>{resolutionInfo.reason}</div>
                </div>
              )}

              {adminMsg && (
                <div className="flex items-start gap-2 text-xs text-[#F7D07A] p-3 rounded-lg bg-[#F7D07A]/10 border border-[#F7D07A]/30 mb-4">
                  {adminMsg}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {showResolve && (
                  <button
                    onClick={onResolve}
                    className="px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] text-sm font-medium inline-flex items-center gap-2"
                    title="Smart resolve"
                  >
                    <Wrench className="w-4 h-4" />
                    Resolve
                  </button>
                )}

                {canSettle && (
                  <button
                    onClick={onSettle}
                    className="px-4 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] text-sm font-medium inline-flex items-center gap-2"
                    title="Settle"
                  >
                    <Hammer className="w-4 h-4" />
                    Settle
                  </button>
                )}

                <button
                  onClick={() => showToast("Use Resolve; it will call cancel automatically when eligible", "info")}
                  className="px-4 py-2 rounded-xl border border-[#587E28] text-[#C9E3A8] hover:bg-[#587E28]/40 text-sm font-medium inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          {/* Create form */}
          <div className="bg-[#1c2a0c]/60 rounded-xl p-4 border border-secondary/30">
            <div className="text-sm font-medium text-[#C9E3A8] mb-3">Create New Tournament</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="space-y-1">
                <span className="text-sm text-[#C9E3A8]">Entry Fee (cUSD)</span>
                <input
                  type="number"
                  min={0.0001}
                  step="0.0001"
                  value={entryFeeCUSD}
                  onChange={(e) => setEntryFeeCUSD(e.target.value)}
                  className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#C9E3A8]">Registration Period (min)</span>
                <input
                  type="number"
                  min={1}
                  step={5}
                  value={regMinutes}
                  onChange={(e) => setRegMinutes(Math.max(1, Number(e.target.value || 60)))}
                  className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#C9E3A8]">Play Period (min)</span>
                <input
                  type="number"
                  min={1}
                  step={5}
                  value={playMinutes}
                  onChange={(e) => setPlayMinutes(Math.max(1, Number(e.target.value || 120)))}
                  className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#C9E3A8]">Questions / Session</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={questionsPerSession}
                  onChange={(e) => setQuestionsPerSession(Math.max(1, Math.min(50, Number(e.target.value || 10))))}
                  className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm text-[#C9E3A8]">Time / Question (s)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={timePerQuestion}
                  onChange={(e) => setTimePerQuestion(Math.max(1, Math.min(120, Number(e.target.value || 30))))}
                  className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onCreateTournament}
                disabled={creating}
                className="px-6 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-60 text-base font-medium"
              >
                {creating ? "Creating…" : "Create Tournament"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
