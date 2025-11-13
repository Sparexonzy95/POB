import { useTournament } from "../context";
import { ArrowLeft, ShieldCheck, Plus } from "lucide-react";

export default function AdminTab() {
  const {
    setActiveTab, tournamentId, info,
    entryFeeCUSD, setEntryFeeCUSD,
    regMinutes, setRegMinutes,
    playMinutes, setPlayMinutes,
    questionsPerSession, setQuestionsPerSession,
    timePerQuestion, setTimePerQuestion,
    creating, onCreateTournament, onResolve, onSettle, stage, isOwner
  } = useTournament();

  if (!isOwner) return null;

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
              <ShieldCheck className="w-6 h-6 text-[#94C751]"/>
              <h2 className="text-lg font-semibold text-[#C9E3A8]">Tournament Administration</h2>
            </div>
          </div>
        </div>

        {/* quick status + actions for selected tournament */}
        {tournamentId && info && (
          <div className="p-6 space-y-4">
            <div className="text-sm">Managing Tournament <b>#{tournamentId}</b> — Status: <b>{stage}</b></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={onResolve} className="px-3 py-2 rounded-xl border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-sm">
                Resolve
              </button>
              <button onClick={onSettle} className="px-3 py-2 rounded-xl border border-[#94C751]/60 text-[#94C751] hover:bg-[#94C751]/10 text-sm">
                Settle
              </button>
            </div>
          </div>
        )}

        {/* create new */}
        <div className="p-6">
          <div className="flex items-center gap-2 font-semibold text-[#C9E3A8] mb-4">
            <Plus className="w-4 h-4"/> Create New Tournament
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Entry Fee (cUSD)">
              <input type="number" min={0.0001} step="0.0001" value={entryFeeCUSD} onChange={(e)=>setEntryFeeCUSD(e.target.value)}
                className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"/>
            </Field>
            <Field label="Registration Period (min)">
              <input type="number" min={1} step={5} value={regMinutes} onChange={(e)=>setRegMinutes(Math.max(1, Number(e.target.value||60)))}
                className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"/>
            </Field>
            <Field label="Play Period (min)">
              <input type="number" min={1} step={5} value={playMinutes} onChange={(e)=>setPlayMinutes(Math.max(1, Number(e.target.value||120)))}
                className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"/>
            </Field>
            <Field label="Questions / Session">
              <input type="number" min={1} max={50} value={questionsPerSession} onChange={(e)=>setQuestionsPerSession(Math.max(1, Math.min(50, Number(e.target.value||10))))}
                className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"/>
            </Field>
            <Field label="Time / Question (s)">
              <input type="number" min={1} max={120} value={timePerQuestion} onChange={(e)=>setTimePerQuestion(Math.max(1, Math.min(120, Number(e.target.value||30))))}
                className="w-full rounded-xl bg-[#263711] border border-[#587E28] px-4 py-2 text-[#C9E3A8] outline-none"/>
            </Field>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={onCreateTournament} disabled={creating}
              className="px-6 py-2 rounded-xl border border-[#94C751] text-[#101707] bg-[#94C751] hover:bg-[#C9E3A8] disabled:opacity-60 text-base font-medium">
              {creating ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-[#101707] border-t-transparent animate-spin"></div>
                  Creating...
                </span>
              ) : "Create Tournament"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({label, children}:{label:string;children:React.ReactNode}) {
  return (
    <label className="space-y-1">
      <span className="text-sm text-[#C9E3A8]">{label}</span>
      {children}
    </label>
  );
}
