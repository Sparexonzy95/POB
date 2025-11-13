import { useTournament } from "../context";
import { Search, Trophy, Users, Clock, ChevronDown, ChevronUp, Award, ShoppingCart, AlertCircle, PlayCircle, RefreshCcw } from "lucide-react";

export default function BrowseTab() {
  const {
    busy, filteredTournaments, setActiveTab, tournamentId, setTournamentId,
    me, dailySessionsInfo, hasReachedDailyLimit,
    searchQuery, setSearchQuery, filterMode, setFilterMode,
    expandedTournamentId, setExpandedTournamentId,
    onRegister, handlePlayClick,
  } = useTournament();

  const toggle = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedTournamentId(expandedTournamentId === id ? null : id);
  };

  const phaseOf = (t: any) => {
    const now = Math.floor(Date.now() / 1000);
    if (now >= t.startTime && now <= t.endTime) return "active";
    if (now < t.registrationEndTime) return "register";
    return "ended";
  };
  const timeLeft = (ts: number) => {
    const now = Math.floor(Date.now() / 1000);
    const s = ts - now; if (s <= 0) return "Ended";
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600)/60);
    if (d>0) return `${d}d ${h}h left`; if (h>0) return `${h}h ${m}m left`; return `${m}m left`;
  };

  return (
    <div className="space-y-4">
      {/* search & filters */}
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30">
        <div className="p-4">
          <div className="flex flex-col gap-3">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94C751]/70"><Search className="w-4 h-4"/></div>
              <input
                value={searchQuery}
                onChange={(e)=>setSearchQuery(e.target.value)}
                placeholder="Search tournaments..."
                className="w-full bg-[#1c2a0c] text-[#C9E3A8] border border-[#587E28]/50 rounded-xl py-2 pl-9 pr-4 outline-none focus:border-[#94C751] text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["all","active","mine"] as const).map(key=>(
                <button key={key}
                  onClick={()=>setFilterMode(key)}
                  className={`px-2 py-2 rounded-xl text-sm ${
                    filterMode===key ? "bg-[#94C751] text-[#101707] font-medium"
                    : "border border-[#587E28] text-[#C9E3A8] hover:bg-[#587E28]/20"
                  }`}
                >
                  {key==="all" ? "All" : key==="active" ? "Active" : "My Entries"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* grid */}
      {busy ? (
        <div className="grid grid-cols-1 gap-4">
          {[1,2,3].map(i=>(
            <div key={i} className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30 animate-pulse">
              <div className="h-12 bg-[#2D4014]"/>
              <div className="p-4 space-y-4">
                <div className="h-4 bg-[#1c2a0c]/60 rounded w-2/3"/>
                <div className="h-6 bg-[#1c2a0c]/60 rounded w-1/2"/>
                <div className="h-10 bg-[#1c2a0c]/60 rounded"/>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTournaments.length ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredTournaments.map((t:any)=>{
            const ph = phaseOf(t);
            const isExpanded = expandedTournamentId === t.id;
            const isSelected = tournamentId === t.id;

            let entryFeeDisplay = "0";
            try { entryFeeDisplay = (BigInt(t.entryFee||"0")/10n**18n).toString(); } catch {}

            const isRegistered = t.registered === true || (t.id===tournamentId && me?.registered);
            const myPasses = t.id===tournamentId ? (me?.passes||0) : (t.myPasses||0);

            return (
              <div
                key={t.id}
                className={`bg-surface rounded-2xl overflow-hidden shadow-lg border transition-all ${
                  isSelected ? "border-[#94C751] shadow-[0_0_10px_rgba(148,199,81,0.3)]"
                  : isRegistered ? "border-[#94C751]/50 hover:border-[#94C751]/70"
                  : "border-secondary/30 hover:border-[#94C751]/50"
                }`}
                onClick={()=>setTournamentId(t.id)}
              >
                <div className={`px-4 py-3 flex justify-between items-center ${
                  ph==="active" ? "bg-[#587E28]" : ph==="register" ? "bg-[#A77F0B]" : "bg-[#2D4014]"
                }`}>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[#EAF9D5]"/>
                    <span className="font-semibold text-[#EAF9D5]">Tournament #{t.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ph==="active" ? "bg-[#94C751] text-[#101707]"
                      : ph==="register" ? "bg-[#F7D07A] text-[#101707]" : "bg-[#6c757d] text-white"
                    }`}>
                      {ph==="active"?"Active":ph==="register"?"Register":"Ended"}
                    </div>
                    {isRegistered && (
                      <div className="px-2 py-0.5 rounded-full bg-[#C9E3A8] text-[#101707] text-xs font-medium border border-[#101707]/10">
                        Registered
                      </div>
                    )}
                    <button onClick={(e)=>toggle(t.id,e)} className="text-[#EAF9D5] hover:text-white">
                      {isExpanded ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
                    </button>
                  </div>
                </div>

                <div className="p-4">
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-base font-medium text-[#C9E3A8]">{entryFeeDisplay} cUSD Entry</div>
                    <div className="text-sm font-medium text-[#C9E3A8]"><Users className="w-4 h-4 inline mr-1"/>{t.playerCount||0} players</div>
                  </div>
                  {ph==="active" && (
                    <div className="mt-2 p-2 bg-[#587E28]/30 rounded-lg text-center">
                      <Clock className="w-4 h-4 inline mr-1 text-[#94C751]"/><span className="text-sm font-medium">{timeLeft(t.endTime)}</span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-secondary/30 space-y-3">
                      <div className="text-sm">Questions per Session: <span className="font-medium">{t.questionsPerSession || 0}</span></div>
                      {isRegistered && (
                        <div className="text-sm font-medium text-[#C9E3A8]">My Passes: {myPasses}</div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    {ph==="register" && !isRegistered ? (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); onRegister(); }}
                        className="flex-1 py-2 rounded-xl bg-[#94C751] text-[#101707] text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#C9E3A8]"
                      >
                        <Award className="w-4 h-4"/> Register
                      </button>
                    ) : ph==="active" && isRegistered ? (
                      ( (t.id===tournamentId ? (me?.passes||0) : myPasses) <= 0 ) ? (
                        <button
                          onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); setActiveTab("details"); }}
                          className="flex-1 py-2 rounded-xl bg-[#F7D07A] text-[#101707] text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#F7D07A]/80"
                        >
                          <ShoppingCart className="w-4 h-4"/> Buy Passes
                        </button>
                      ) : hasReachedDailyLimit ? (
                        <button
                          onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); setActiveTab("details"); }}
                          className="flex-1 py-2 rounded-xl bg-[#94C751]/50 text-[#101707]/50 text-sm font-medium inline-flex items-center justify-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4"/> Limit Reached
                        </button>
                      ) : (
                        <button
                          onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); handlePlayClick(); }}
                          className="flex-1 py-2 rounded-xl bg-[#94C751] text-[#101707] text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-[#C9E3A8]"
                        >
                          <PlayCircle className="w-4 h-4"/> Play Now
                        </button>
                      )
                    ) : (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); setActiveTab("details"); }}
                        className="flex-1 py-2 rounded-xl border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-sm"
                      >
                        View Details
                      </button>
                    )}

                    <button
                      onClick={(e)=>{ e.stopPropagation(); setTournamentId(t.id); setActiveTab("leaderboard"); }}
                      className="px-3 py-2 rounded-xl border border-secondary/60 hover:bg-secondary/20 text-sm inline-flex items-center justify-center"
                      title="View Leaderboard"
                    >
                      <Award className="w-4 h-4"/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-surface rounded-2xl p-8 border border-secondary/30 text-center">
          <Trophy className="w-16 h-16 mx-auto text-[#94C751]/30 mb-4"/>
          <div className="text-xl font-medium text-[#C9E3A8] mb-2">No tournaments found</div>
          <div className="text-sm opacity-70 max-w-md mx-auto mb-4">
            {filterMode==="active" ? "There are no active tournaments at the moment."
            : filterMode==="mine" ? "You haven't registered for any tournaments yet."
            : (searchQuery ? `No results for "${searchQuery}"` : "No tournaments available at the moment.")}
          </div>
          <button
            onClick={()=>{ setSearchQuery(""); location.reload(); }}
            className="px-4 py-2 rounded-xl border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 inline-flex items-center gap-2 mx-auto"
          >
            <RefreshCcw className="w-4 h-4"/> Refresh List
          </button>
        </div>
      )}
    </div>
  );
}