import { useTournament } from "../context";
import { ArrowLeft, Award, RefreshCcw, Trophy } from "lucide-react";

export default function LeaderboardTab() {
  const { tournamentId, info, board, address, setActiveTab, refresh, stage } = useTournament();

  if (!tournamentId) {
    return (
      <Empty
        title="No Tournament Selected"
        text="Please select a tournament to view its leaderboard"
        action={() => setActiveTab("browse")}
        actionLabel="Browse Tournaments"
      />
    );
  }

  if (!board) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-12 h-12 rounded-full border-4 border-[#94C751] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30">
        <div className="bg-[#2D4014] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={()=>setActiveTab("browse")}
                className="w-8 h-8 rounded-full bg-[#2D4014]/50 flex items-center justify-center" title="Back">
                <ArrowLeft className="w-4 h-4 text-[#C9E3A8]"/>
              </button>
              <Award className="w-6 h-6 text-[#94C751]"/>
              <div>
                <h2 className="text-lg font-semibold text-[#C9E3A8]">Tournament #{tournamentId} Leaderboard</h2>
                <div className="text-sm text-[#C9E3A8]/80">{info?.playerCount || 0} players competing</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {info && (
                <div className={`px-2 py-0.5 rounded-full text-xs font-medium mr-2 ${
                  stage==="play" ? "bg-[#94C751] text-[#101707]"
                  : stage==="register" ? "bg-[#F7D07A] text-[#101707]" : "bg-[#6c757d] text-white"
                }`}>
                  {stage==="play"?"Active":stage==="register"?"Registration":"Ended"}
                </div>
              )}
              <button onClick={refresh} className="px-3 py-1 rounded-xl bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 text-sm inline-flex items-center gap-1">
                <RefreshCcw className="w-4 h-4"/> Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {board.players.length === 0 ? (
            <div className="py-8 text-center">
              <Trophy className="w-12 h-12 text-[#94C751]/30 mx-auto mb-3"/>
              <div className="text-lg font-medium text-[#C9E3A8] mb-1">No players yet</div>
              <div className="text-sm opacity-70">Be the first to join this tournament!</div>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {board.players.map((player, i) => (
                <div key={`${player}-${i}`}
                  className={`flex items-center bg-[#1c2a0c]/60 rounded-xl p-3 border ${
                    player.toLowerCase() === address?.toLowerCase()
                      ? 'border-[#94C751] bg-[#587E28]/30'
                      : 'border-[#587E28]/50'
                  }`}
                >
                  <PlaceBadge i={i}/>
                  <div className={`flex-1 min-w-0 truncate ${player.toLowerCase()===address?.toLowerCase() ? 'text-[#C9E3A8] font-medium':''}`}>
                    {player.toLowerCase()===address?.toLowerCase() ? 'You' : player}
                  </div>
                  <div className="ml-3 text-base font-semibold text-[#C9E3A8]">{board.scores[i]} pts</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceBadge({ i }: { i: number }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3";
  if (i===0) return <div className={`${base} bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/50`}>1</div>;
  if (i===1) return <div className={`${base} bg-[#C0C0C0]/20 text-[#C0C0C0] border border-[#C0C0C0]/50`}>2</div>;
  if (i===2) return <div className={`${base} bg-[#CD7F32]/20 text-[#CD7F32] border border-[#CD7F32]/50`}>3</div>;
  return <div className={`${base} bg-[#263711] text-highlight/70 border border-highlight/30`}>{i+1}</div>;
}

function Empty({title, text, action, actionLabel}:{title:string;text:string;action:()=>void;actionLabel:string;}) {
  return (
    <div className="bg-surface rounded-2xl p-8 border border-secondary/30 text-center">
      <Trophy className="w-16 h-16 mx-auto text-[#94C751]/30 mb-4"/>
      <div className="text-xl font-medium text-[#C9E3A8] mb-2">{title}</div>
      <div className="text-sm opacity-70 max-w-md mx-auto mb-4">{text}</div>
      <button onClick={action} className="px-4 py-2 rounded-xl border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 inline-flex items-center gap-2 mx-auto">
        <ArrowLeft className="w-4 h-4"/> {actionLabel}
      </button>
    </div>
  );
}
