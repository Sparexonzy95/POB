import useTournamentPanel from "./useTournamentPanel";
import Toast from "./ui/Toast";
import BrowseTab from "./tabs/BrowseTab";
import DetailsTab from "./tabs/DetailsTab";
import LeaderboardTab from "./tabs/LeaderboardTab";
import AdminTab from "./tabs/AdminTab";

export default function TournamentPanel({
  address,
  onPlay,
}: {
  address?: `0x${string}` | null;
  onPlay?: (tournamentId: number) => void;
}) {
  const s = useTournamentPanel(address);

  // daily limit (API fallback kept simple)
  const used = 0;
  const limit = s.MAX_DAILY_PLAYS;

  return (
    <div className="space-y-6">
      {s.toast.visible && (
        <Toast
          message={s.toast.message}
          type={s.toast.type}
          onClose={() => s.setToast((t) => ({ ...t, visible: false }))}
        />
      )}

      {/* Tabs header */}
      <div className="bg-[#1A2E0A] rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-[#2D4014] px-4 py-3 flex justify-between items-center">
          <div className="text-[#C9E3A8] font-semibold flex items-center gap-2">
            <span>🎖️ Tournaments</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                s.loadAll();
                s.refresh();
              }}
              className="px-3 py-1 text-xs rounded-lg bg-[#94C751]/20 text-[#94C751] hover:bg-[#94C751]/30 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="flex border-b border-[#3A5019]">
          {(["browse", "details", "leaderboard"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => s.setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-all flex-1 ${
                s.activeTab === tab
                  ? "text-[#94C751] border-b-2 border-[#94C751]"
                  : "text-[#C9E3A8]/70 hover:text-[#C9E3A8]"
              }`}
            >
              {tab[0].toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {s.isOwner && (
            <button
              onClick={() => s.setActiveTab("admin")}
              className={`px-4 py-3 text-sm font-medium transition-all flex-1 ${
                s.activeTab === "admin"
                  ? "text-[#94C751] border-b-2 border-[#94C751]"
                  : "text-[#C9E3A8]/70 hover:text-[#C9E3A8]"
              }`}
            >
              Admin
            </button>
          )}
        </div>
      </div>

      {/* Selected indicator */}
      {(s.activeTab === "details" ||
        s.activeTab === "leaderboard" ||
        s.activeTab === "admin") &&
        s.tournamentId > 0 && (
          <div className="bg-[#1c2a0c]/60 rounded-xl px-3 py-2 border border-[#587E28]/30">
            <div className="text-sm flex items-center justify-between">
              <div>
                Selected:{" "}
                <span className="text-[#C9E3A8] font-medium">
                  Tournament #{s.tournamentId}
                </span>
              </div>
              <button
                onClick={() => s.setActiveTab("browse")}
                className="text-xs text-[#94C751] hover:underline"
              >
                Change Tournament
              </button>
            </div>
          </div>
        )}

      {/* Tabs content */}
      {s.activeTab === "browse" && (
        <BrowseTab
          state={{
            allTournaments: s.allTournaments,
            busy: s.busy,
            filterMode: s.filterMode,
            setFilterMode: s.setFilterMode,
            searchQuery: s.searchQuery,
            setSearchQuery: s.setSearchQuery,
            expandedTournamentId: s.expandedTournamentId,
            setExpandedTournamentId: s.setExpandedTournamentId,
            tournamentId: s.tournamentId,
            setTournamentId: s.setTournamentId,
            me: s.me,
          }}
          actions={{
            refresh: s.refresh,
            loadAll: s.loadAll,
            setActiveTab: s.setActiveTab,
            onRegister: s.onRegister,
            // 🔗 pass the hook's play function
            onPlayClick: s.onPlayClick,
          }}
          // 🔗 NEW: give BrowseTab your parent onPlay so it can navigate
          onPlay={onPlay}
        />
      )}

      {s.activeTab === "details" && (
        <DetailsTab
          state={{
            tournamentId: s.tournamentId,
            info: s.info,
            me: s.me,
            passes: s.passes,
            setPasses: s.setPasses,
            stage: s.stage,
          }}
          actions={{
            setActiveTab: s.setActiveTab,
            onRegister: s.onRegister,
            onBuyPasses: s.onBuyPasses,
            onPlayClick: s.onPlayClick,
          }}
          limits={{ used, limit }}
          onPlay={onPlay}
        />
      )}

      {s.activeTab === "leaderboard" && (
        <LeaderboardTab
          state={{
            tournamentId: s.tournamentId,
            info: s.info,
            board: s.board,
            address,
            stage: s.stage,
          }}
          actions={{ setActiveTab: s.setActiveTab, refresh: s.refresh }}
        />
      )}

      {s.activeTab === "admin" && s.isOwner && (
        <AdminTab
          state={{
            isOwner: s.isOwner,
            tournamentId: s.tournamentId,
            info: s.info,
            stage: s.stage,
            resolutionInfo: s.resolutionInfo,
            adminMsg: s.adminMsg,
            creating: s.creating,
            entryFeeCUSD: s.entryFeeCUSD,
            setEntryFeeCUSD: s.setEntryFeeCUSD,
            regMinutes: s.regMinutes,
            setRegMinutes: s.setRegMinutes,
            playMinutes: s.playMinutes,
            setPlayMinutes: s.setPlayMinutes,
            questionsPerSession: s.questionsPerSession,
            setQuestionsPerSession: s.setQuestionsPerSession,
            timePerQuestion: s.timePerQuestion,
            setTimePerQuestion: s.setTimePerQuestion,
          }}
          actions={{
            setActiveTab: s.setActiveTab,
            onCreateTournament: s.onCreateTournament,
            onResolve: s.onResolve,
            onSettle: s.onSettle,
            showToast: s.showToast,
          }}
        />
      )}
    </div>
  );
}
