"use client";

import type { TradeTape } from "@/hooks/useMarketSocket";

const MOCK_TRADES: TradeTape[] = [
  { id: "1", price: 62, quantity: 50, side: "BUY", time: "10:45:01" },
  { id: "2", price: 61, quantity: 120, side: "SELL", time: "10:44:58" },
];

export default function RecentTrades({ trades }: { trades: TradeTape[] }) {
  const tape = trades.length > 0 ? trades : MOCK_TRADES;

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col h-full overflow-hidden">
      <h2 className="text-xs font-bold tracking-widest text-zinc-500 mb-4 pb-3 border-b border-white/5 flex justify-between">
        <span>MARKET TRADES (TAPE)</span>
        <span className="text-indigo-400/50">LIVE</span>
      </h2>

      <div className="flex justify-between text-[10px] font-bold tracking-widest text-zinc-600 mb-2 px-2">
        <span>PRICE</span>
        <span>VOL</span>
        <span>TIME</span>
      </div>

      <div className="space-y-1 font-mono text-sm tabular-nums overflow-y-auto pr-2 custom-scrollbar">
        {tape.map((trade) => (
          <div key={trade.id} className="flex justify-between items-center py-1.5 px-2 hover:bg-white/5 rounded transition-colors">
            <span className={`font-bold ${trade.side === "BUY" ? "text-emerald-400" : "text-rose-400"}`}>
              ${(trade.price / 100).toFixed(2)}
            </span>
            <span className="text-zinc-300">{trade.quantity}</span>
            <span className="text-zinc-600 text-xs">{trade.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
