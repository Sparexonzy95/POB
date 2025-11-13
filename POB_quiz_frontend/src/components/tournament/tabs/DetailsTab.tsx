import { useMemo } from "react";
import { useTournament } from "../context";
import { ArrowLeft, Trophy, Coins, Award, Brain, HelpCircle, ShoppingCart, PlayCircle, AlertCircle } from "lucide-react";

export default function DetailsTab() {
  const {
    tournamentId, info, stage, me, busy,
    setActiveTab, onRegister, passes, setPasses,
    onBuyPasses, handlePlayClick, hasReachedDailyLimit,
  } = useTournament();

  const entryFeePretty = useMemo(()=>{
    if (!info) return "—";
    try {
      const v = BigInt(info.entryFee);
      const whole = v / 10n**18n;
      const frac = (v % 10n**18n).toString().padStart(18,"0").slice(0,4);
      return `${whole}.${frac} cUSD`;
    } catch { return "—"; }
  },[info]);

  const prizePretty = useMemo(()=>{
    if (!info) return "0.0000 cUSD";
    try {
      const v = BigInt(info.totalPool);
      const w = v / 10n**18n;
      const f = (v % 10n**18n).toString().padStart(18,"0").slice(0,4);
      return `${w}.${f} cUSD`;
    } catch { return "0.0000 cUSD"; }
  },[info]);

  const formatTimeLeft = (ts:number)=>{
    const now = Math.floor(Date.now()/1000), s = ts-now;
    if (s<=0) return "Ended";
    const d=Math.floor(s/86400), h=Math.floor((s%86400)/3600), m=Math.floor((s%3600)/60);
    if (d>0) return `${d}d ${h}h left`; if (h>0) return `${h}h ${m}m left`; return `${m}m left`;
  };

  if (!info) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-12 h-12 rounded-full border-4 border-[#94C751] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`px-6 py-4 rounded-2xl overflow-hidden border ${stage==="play"?"bg-[#587E28]":"bg-[#2D4014]"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={()=>setActiveTab("browse")} className="w-8 h-8 rounded-full bg-[#2D4014]/50 flex items-center justify-center" title="Back">
              <ArrowLeft className="w-4 h-4 text-[#C9E3A8]"/>
            </button>
            <div className="w-12 h-12 rounded-full bg-[#94C751]/20 border border-[#94C751]/40 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-[#94C751]"/>
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#EAF9D5]">Tournament #{tournamentId}</h2>
              <div className="text-sm text-[#EAF9D5]/80">
                {stage==="play" ? `Active • ${formatTimeLeft(info.endTime)}`
                : stage==="register" ? `Registration open • Starts in ${formatTimeLeft(info.startTime)}`
                : `Tournament ended • ${info.settled ? "Settled" : "Not settled"}`}
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            stage==="play" ? "bg-[#94C751] text-[#101707]"
            : stage==="register" ? "bg-[#F7D07A] text-[#101707]"
            : info.settled ? "bg-[#94C751]/30 text-[#94C751]" : "bg-[#6c757d] text-white"
          }`}>
            {stage==="play"?"Active":stage==="register"?"Registration":info.settled?"Settled":"Ended"}
          </div>
        </div>

        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat label="Entry Fee" value={entryFeePretty} icon={<Coins className="w-5 h-5 text-[#94C751]"/>}/>
          <Stat label="Prize Pool" value={prizePretty} icon={<Award className="w-5 h-5 text-[#94C751]"/>}/>
          <Stat label="Players" value={String(info.playerCount||0)} icon={<Trophy className="w-5 h-5 text-[#94C751]"/>}/>
          <Stat label="Questions" value={String(info.questionsPerSession||0)} icon={<Brain className="w-5 h-5 text-[#94C751]"/>}/>
        </div>
      </div>

      {me && (
        <div className="p-4 rounded-xl bg-[#1c2a0c]/60 border border-secondary/30">
          <div className="text-sm font-semibold text-[#C9E3A8] mb-3">Your Participation</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KV k="Status" v={me.registered ? <span className="text-[#94C751]">Registered</span> : "Not registered"} />
            <KV k={<span className="inline-flex items-center gap-1">Passes <HelpCircle className="w-3 h-3 opacity-50"/></span>} v={String(me.passes||0)} />
            <KV k={<span className="inline-flex items-center gap-1">Daily Games <HelpCircle className="w-3 h-3 opacity-50"/></span>} v={<span className={hasReachedDailyLimit ? "text-[#F7D07A]":""}>{(me._dummy||0)}{/* placeholder; kept for layout */}</span>} />
            <KV k="Total Points" v={String(me.totalPoints||0)} />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {stage==="register" && !me.registered && (
              <button onClick={onRegister} disabled={busy} className="px-4 py-2 rounded-xl bg-[#94C751] text-[#101707] font-medium text-sm inline-flex items-center gap-2 hover:bg-[#C9E3A8] disabled:opacity-60">
                <Award className="w-4 h-4"/> Register
              </button>
            )}

            {stage==="play" && me.registered && (
              <>
                {me.passes <= 0 ? (
                  <div className="flex items-stretch gap-2 min-w-0">
                    <input
                      type="number" min={1} max={100}
                      value={passes}
                      onChange={(e)=>{ const v = Math.max(1, Math.min(100, Number(e.target.value||1))); isNaN(v) ? null : setPasses(v); }}
                      className="w-16 md:w-24 rounded-xl bg-[#263711] border border-[#587E28] px-3 text-[#C9E3A8] outline-none"
                      placeholder="Passes"
                    />
                    <button onClick={onBuyPasses} disabled={busy} className="inline-flex items-center gap-2 px-4 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-60">
                      <ShoppingCart className="w-4 h-4"/> Buy Passes
                    </button>
                  </div>
                ) : (
                  <button onClick={handlePlayClick} disabled={hasReachedDailyLimit}
                    className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 ${
                      hasReachedDailyLimit ? "bg-[#94C751]/50 text-[#101707]/50 cursor-not-allowed"
                      : "bg-[#94C751] text-[#101707] hover:bg-[#C9E3A8]"
                    }`}>
                    <PlayCircle className="w-4 h-4"/> Play Now
                  </button>
                )}
                {hasReachedDailyLimit && (
                  <div className="text-[#F7D07A] text-sm flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 shrink-0"/> Daily limit reached
                  </div>
                )}
              </>
            )}

            <button onClick={()=>setActiveTab("leaderboard")}
              className="px-4 py-2 rounded-xl border border-secondary/60 text-sm hover:bg-secondary/20 inline-flex items-center gap-2">
              <Award className="w-4 h-4"/> View Leaderboard
            </button>
          </div>
        </div>
      )}

      {/* rules kept terse to avoid duplication; you can paste your full rules block here */}
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30 p-6">
        <div className="text-[#C9E3A8] font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[#94C751]"/> Tournament Rules & Information
        </div>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>Register during registration phase</li>
          <li>Buy passes (≈1% of entry fee each) to play</li>
          <li>Play up to 2 times/day during active phase</li>
          <li>Top 3 share the prize pool</li>
        </ul>
      </div>
    </div>
  );
}

function Stat({label, value, icon}:{label:string; value:React.ReactNode; icon:React.ReactNode}) {
  return (
    <div>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-xl font-semibold text-[#C9E3A8] flex items-center gap-1">{icon} {value}</div>
    </div>
  );
}

function KV({k, v}:{k:React.ReactNode; v:React.ReactNode}) {
  return (
    <div>
      <div className="text-xs opacity-70">{k}</div>
      <div className="text-sm font-medium">{v}</div>
    </div>
  );
}
