import { TournamentCtx } from "./context";
import { useTournamentPanel } from "./useTournamentPanel";
import BrowseTab from "./tabs/BrowseTab";
import DetailsTab from "./tabs/DetailsTab";
import LeaderboardTab from "./tabs/LeaderboardTab";
import AdminTab from "./tabs/AdminTab";
import Toast from "./ui/Toast";
import { Trophy, RefreshCcw, PlusCircle, Info, Award, ShieldCheck, List } from "lucide-react";

export default function TournamentPanel({
  address,
  onPlay,
}: {
  address?: `0x${string}` | null;
  onPlay?: (tournamentId: number) => void;
}) {
  const state = useTournamentPanel(address, onPlay);

  const {
    activeTab, setActiveTab, isOwner, toast, hideToast, forceFullRefresh, loadAllTournaments, refresh,
    tournamentId,
  } = state;

  return (
    <TournamentCtx.Provider value={state}>
      <div className="space-y-6">
        {toast.visible && (
          <Toast message={toast.message} type={toast.type} onClose={hideToast} />
        )}

        {/* Header + tabs */}
        <div className="bg-[#1A2E0A] rounded-2xl shadow-lg overflow-hidden">
          <div className="bg-[#2D4014] px-4 py-3 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[#C9E3A8] font-semibold">
              <Trophy className="w-5 h-5" />
              <span>Tournaments</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={forceFullRefresh}
                className="px-3 py-1 text-xs rounded-lg bg-[#F7D07A]/20 text-[#F7D07A] hover:bg-[#F7D07A]/30 inline-flex items-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" /> Force Sync
              </button>
              <button
                onClick={() => { loadAllTournaments(); refresh(); }}
                className="px-3 py-1 text-xs rounded-lg bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 inline-flex items-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" /> Refresh
              </button>
              {isOwner && (
                <button
                  onClick={() => setActiveTab("admin")}
                  className="px-3 py-1 text-xs rounded-lg bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> Create
                </button>
              )}
            </div>
          </div>

          <div className="flex border-b border-[#3A5019]">
            <TabBtn icon={<List className="w-4 h-4" />} active={activeTab==="browse"} onClick={()=>setActiveTab("browse")} label="Browse" />
            <TabBtn icon={<Info className="w-4 h-4" />} active={activeTab==="details"} onClick={()=>setActiveTab("details")} label="Details" disabled={!tournamentId}/>
            <TabBtn icon={<Award className="w-4 h-4" />} active={activeTab==="leaderboard"} onClick={()=>setActiveTab("leaderboard")} label="Leaderboard" disabled={!tournamentId}/>
            {isOwner && (
              <TabBtn icon={<ShieldCheck className="w-4 h-4" />} active={activeTab==="admin"} onClick={()=>setActiveTab("admin")} label="Admin" />
            )}
          </div>
        </div>

        {/* Selected indicator */}
        {(activeTab === "details" || activeTab === "leaderboard" || activeTab === "admin") && tournamentId && (
          <div className="bg-[#1c2a0c]/60 rounded-xl px-3 py-2 border border-[#587E28]/30">
            <div className="text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#94C751]" />
                <span>Selected: <span className="text-[#C9E3A8] font-medium">Tournament #{tournamentId}</span></span>
              </div>
              <button onClick={() => setActiveTab("browse")} className="text-xs text-[#94C751] hover:underline">
                Change Tournament
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        {activeTab === "browse" && <BrowseTab />}
        {activeTab === "details" && <DetailsTab />}
        {activeTab === "leaderboard" && <LeaderboardTab />}
        {activeTab === "admin" && isOwner && <AdminTab />}
      </div>
    </TournamentCtx.Provider>
  );
}

function TabBtn({
  icon, label, active, onClick, disabled
}: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; disabled?: boolean; }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-all flex-1 flex items-center justify-center gap-1 ${
        active ? "text-[#94C751] border-b-2 border-[#94C751]" : "text-[#C9E3A8]/70 hover:text-[#C9E3A8]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {icon} {label}
    </button>
  );
}
