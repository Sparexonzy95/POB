import { ArrowLeft, Award, AlertCircle, Brain, Coins, HelpCircle, PlayCircle, ShoppingCart, Trophy, Users, Info } from "lucide-react";
import Tooltip from "../ui/Tooltip";
import { formatTimeLeft, prettyWeiCusd } from "../helpers";

export default function DetailsTab({
  state, actions, limits, onPlay,
}: {
  state: {
    tournamentId: number;
    info: any;
    me: any;
    passes: number;
    setPasses: (n: number) => void;
    stage: "register" | "play" | "ended" | "unknown";
  };
  actions: {
    setActiveTab: (t: "browse" | "details" | "leaderboard" | "admin") => void;
    onRegister: () => void;
    onBuyPasses: (count: number) => void;
    onPlayClick: (
      cb?: (id: number) => void,
      dailyUsed?: number,
      dailyLimit?: number,
      explicitTournamentId?: number
    ) => void;
  };
  limits: { used: number; limit: number };
  onPlay?: (id: number) => void;
}) {
  const { tournamentId, info, me, passes, setPasses, stage } = state;
  const { setActiveTab, onRegister, onBuyPasses, onPlayClick } = actions;
  const { used, limit } = limits;

  if (!info)
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-12 h-12 rounded-full border-4 border-[#94C751] border-t-transparent animate-spin"></div>
      </div>
    );

  const phaseBadge =
    stage === "play" ? "bg-[#94C751] text-[#101707]"
    : stage === "register" ? "bg-[#F7D07A] text-[#101707]"
    : info.settled ? "bg-[#94C751]/30 text-[#94C751]" : "bg-[#6c757d] text-white";

  return (
    <div className="space-y-4">
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30">
        <div className={`${stage === "play" ? "bg-[#587E28]" : stage === "register" ? "bg-[#A77F0B]" : "bg-[#2D4014]"} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab("browse")} className="w-8 h-8 rounded-full bg-[#2D4014]/50 flex items-center justify-center" title="Back">
                <ArrowLeft className="w-4 h-4 text-[#C9E3A8]" />
              </button>
              <div className="w-12 h-12 rounded-full bg-[#94C751]/20 border border-[#94C751]/40 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-[#94C751]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#EAF9D5]">Tournament #{tournamentId}</h2>
                <div className="text-sm text-[#EAF9D5]/80">
                  {stage === "play"
                    ? `Active • ${formatTimeLeft(info.endTime)}`
                    : stage === "register"
                    ? `Registration open • Starts in ${formatTimeLeft(info.startTime)}`
                    : `Tournament ended • ${info.settled ? "Settled" : "Not settled"}`}
                </div>
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${phaseBadge}`}>
              {stage === "play" ? "Active" : stage === "register" ? "Registration" : info.settled ? "Settled" : "Ended"}
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-xs opacity-70">Entry Fee</div>
              <div className="text-xl font-semibold text-[#C9E3A8] flex items-center gap-1">
                <Coins className="w-5 h-5 text-[#94C751]" />
                {prettyWeiCusd(info.entryFee)}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Prize Pool</div>
              <div className="text-xl font-semibold text-[#C9E3A8] flex items-center gap-1">
                <Award className="w-5 h-5 text-[#94C751]" />
                {prettyWeiCusd(info.totalPool ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Players</div>
              <div className="text-xl font-semibold text-[#C9E3A8] flex items-center gap-1">
                <Users className="w-5 h-5 text-[#94C751]" />
                {info.playerCount || 0}
              </div>
            </div>
            <div>
              <div className="text-xs opacity-70">Questions</div>
              <div className="text-xl font-semibold text-[#C9E3A8] flex items-center gap-1">
                <Brain className="w-5 h-5 text-[#94C751]" />
                {info.questionsPerSession || 0}
              </div>
            </div>
          </div>

          {me && (
            <div className="mt-8 p-4 rounded-xl bg-[#1c2a0c]/60 border border-secondary/30">
              <div className="text-sm font-semibold text-[#C9E3A8] mb-3">Your Participation</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs opacity-70">Status</div>
                  <div className="text-sm font-medium">{me.registered ? <span className="text-[#94C751]">Registered</span> : "Not registered"}</div>
                </div>
                <div>
                  <Tooltip label="Passes allow you to play tournament rounds.">
                    <div className="text-xs opacity-70 flex items-center gap-1">
                      Passes <HelpCircle className="w-3 h-3 opacity-50" />
                    </div>
                  </Tooltip>
                  <div className="text-sm font-medium">{me.passes || 0}</div>
                </div>
                <div>
                  <Tooltip label="You can play each tournament up to 2 times per day.">
                    <div className="text-xs opacity-70 flex items-center gap-1">
                      Daily Games <HelpCircle className="w-3 h-3 opacity-50" />
                    </div>
                  </Tooltip>
                  <div className="text-sm font-medium">
                    <span className={limits.used >= limits.limit ? "text-[#F7D07A]" : ""}>
                      {limits.used}/{limits.limit}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-xs opacity-70">Total Points</div>
                  <div className="text-sm font-medium">{me.totalPoints || 0}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {stage === "register" && !me.registered && (
                  <button
                    onClick={onRegister}
                    className="px-4 py-2 rounded-xl bg-[#94C751] text-[#101707] font-medium text-sm inline-flex items-center gap-2 hover:bg-[#C9E3A8]"
                  >
                    <Award className="w-4 h-4" /> Register
                  </button>
                )}

                {stage === "play" && me.registered && (
                  <>
                    {me.passes <= 0 ? (
                      <div className="flex items-stretch gap-2 min-w-0">
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={passes}
                          onChange={(e) => {
                            const n = Math.max(1, Math.min(100, Number(e.target.value || 1)));
                            setPasses(n);
                          }}
                          className="w-16 md:w-24 rounded-xl bg-[#263711] border border-[#587E28] px-3 text-[#C9E3A8] outline-none"
                          placeholder="Passes"
                        />
                        <button
                          onClick={() => onBuyPasses(passes)}
                          className="inline-flex items-center gap-2 px-4 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8]"
                        >
                          <ShoppingCart className="w-4 h-4" /> Buy Passes
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onPlayClick(onPlay, limits.used, limits.limit, tournamentId)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 ${
                          limits.used >= limits.limit ? "bg-[#94C751]/50 text-[#101707]/50 cursor-not-allowed" : "bg-[#94C751] text-[#101707] hover:bg-[#C9E3A8]"
                        }`}
                        disabled={limits.used >= limits.limit}
                      >
                        <PlayCircle className="w-4 h-4" /> Play Now
                      </button>
                    )}

                    {limits.used >= limits.limit && (
                      <div className="text-[#F7D07A] text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 shrink-0" /> Daily limit reached
                      </div>
                    )}
                  </>
                )}

                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className="px-4 py-2 rounded-xl border border-secondary/60 text-sm hover:bg-secondary/20 inline-flex items-center gap-2"
                >
                  <Award className="w-4 h-4" /> View Leaderboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* rules/info box unchanged */}
      <div className="bg-surface rounded-2xl overflow-hidden shadow-lg border border-secondary/30">
        <div className="px-6 py-4">
          <div className="text-[#C9E3A8] font-semibold mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-[#94C751]" /> Tournament Rules & Information
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1c2a0c]/60 rounded-xl p-4">
              <div className="text-sm font-medium text-[#C9E3A8] mb-3">How to Play</div>
              <ol className="list-decimal list-inside space-y-2 text-sm pl-2">
                <li>Register during the registration phase.</li>
                <li>Buy passes (1% of entry) to play.</li>
                <li>Answer {info.questionsPerSession || 0} questions to earn points.</li>
                <li>Play up to 2 games/day during the tournament.</li>
                <li>Reach the top of the leaderboard to win.</li>
              </ol>
            </div>
            <div className="bg-[#1c2a0c]/60 rounded-xl p-4">
              <div className="text-sm font-medium text-[#C9E3A8] mb-3">Prize Distribution</div>
              <div className="space-y-2 text-sm opacity-90">
                <div>1st — 60% of prize pool</div>
                <div>2nd — 30% of prize pool</div>
                <div>3rd — 10% of prize pool</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
