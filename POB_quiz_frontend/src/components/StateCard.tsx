export default function StateCard({ state }: { state: any }) {
  return (
    <div className="bg-gypsum text-wood rounded-2xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-lotus/30 space-y-2">
      <div className="text-sm opacity-70">Contract</div>
      <div className="text-xs break-all">{import.meta.env.VITE_QUIZ_ADDRESS}</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Entry Fee</div><div className="text-right">{Number(state.entryFee)/1e18} cUSD</div>
        <div>House %</div><div className="text-right">{state.houseFeePercent}%</div>
        <div>Total Funds</div><div className="text-right">{Number(state.totalFunds)/1e18} cUSD</div>
        <div>cUSD</div><div className="text-right text-[10px]">{state.cUSD}</div>
      </div>
    </div>
  )
}
