import TopNav from "@/components/TopNav";

// Mock data representing the output of a complex Postgres aggregate query
const TOP_TRADERS = [
  { rank: 1, address: "0x7F...9a2B", pnl: 45210.50, winRate: 68.4, volume: "1.2M", trend: "up" },
  { rank: 2, address: "0x33...1d4C", pnl: 38900.25, winRate: 71.2, volume: "980K", trend: "up" },
  { rank: 3, address: "0x9B...2a8E", pnl: 29450.00, winRate: 59.8, volume: "2.4M", trend: "down" },
  { rank: 4, address: "0xA1...4f33", pnl: 18200.75, winRate: 54.1, volume: "450K", trend: "up" },
  { rank: 5, address: "0xC2...8b11", pnl: -4200.00, winRate: 42.5, volume: "890K", trend: "down" },
];

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      <TopNav />

      <main className="flex-1 p-4 md:p-8 max-w-[1200px] w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4">Global Leaderboard</h1>
          <p className="text-zinc-400">Ranked by Realized Profit & Loss (P&L) across all resolved markets.</p>
        </div>

        {/* The Top 3 Podium (Visual Flair) */}
        <div className="grid grid-cols-3 gap-4 mb-8 items-end max-w-3xl mx-auto">
          {/* Rank 2 */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-t-2xl p-6 text-center border-b-0 relative shadow-[0_-10px_30px_rgba(255,255,255,0.02)] h-[90%]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-400 border-4 border-zinc-950">2</div>
            <div className="mt-4 font-mono text-sm text-zinc-300 mb-2">{TOP_TRADERS[1].address}</div>
            <div className="text-xl font-mono font-bold text-emerald-400">+${TOP_TRADERS[1].pnl.toLocaleString()}</div>
          </div>
          
          {/* Rank 1 */}
          <div className="bg-indigo-900/20 backdrop-blur-md border border-indigo-500/20 rounded-t-2xl p-6 text-center border-b-0 relative shadow-[0_-20px_40px_rgba(99,102,241,0.1)] h-full">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white border-4 border-zinc-950 shadow-[0_0_15px_rgba(99,102,241,0.5)]">1</div>
            <div className="mt-6 font-mono text-sm font-bold text-white mb-2">{TOP_TRADERS[0].address}</div>
            <div className="text-2xl font-mono font-extrabold text-emerald-400">+${TOP_TRADERS[0].pnl.toLocaleString()}</div>
            <div className="text-xs text-indigo-400 font-bold tracking-widest mt-2">ALPHA TRADER</div>
          </div>

          {/* Rank 3 */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-t-2xl p-6 text-center border-b-0 relative shadow-[0_-10px_30px_rgba(255,255,255,0.02)] h-[80%]">
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center font-bold text-zinc-500 border-4 border-zinc-950">3</div>
            <div className="mt-4 font-mono text-sm text-zinc-300 mb-2">{TOP_TRADERS[2].address}</div>
            <div className="text-lg font-mono font-bold text-emerald-400">+${TOP_TRADERS[2].pnl.toLocaleString()}</div>
          </div>
        </div>

        {/* The Data Table */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/50 border-b border-white/5">
                  <th className="p-4 text-xs font-bold tracking-widest text-zinc-500 w-16 text-center">RANK</th>
                  <th className="p-4 text-xs font-bold tracking-widest text-zinc-500">TRADER</th>
                  <th className="p-4 text-xs font-bold tracking-widest text-zinc-500 text-right">WIN RATE</th>
                  <th className="p-4 text-xs font-bold tracking-widest text-zinc-500 text-right">VOLUME</th>
                  <th className="p-4 text-xs font-bold tracking-widest text-zinc-500 text-right">REALIZED P&L</th>
                </tr>
              </thead>
              <tbody className="font-mono text-sm">
                {TOP_TRADERS.slice(3).map((trader) => (
                  <tr key={trader.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                    <td className="p-4 text-center text-zinc-500">{trader.rank}</td>
                    <td className="p-4 text-zinc-300 flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-gradient-to-tr from-zinc-800 to-zinc-700"></div>
                      {trader.address}
                    </td>
                    <td className="p-4 text-right text-zinc-400">{trader.winRate}%</td>
                    <td className="p-4 text-right text-zinc-400">${trader.volume}</td>
                    <td className={`p-4 text-right font-bold tabular-nums ${trader.pnl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {trader.pnl >= 0 ? "+" : ""}${trader.pnl.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}