"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

type TradeTicketProps = {
  marketId: number;
  initialPrice?: number;
};

export default function TradeTicket({ marketId, initialPrice }: TradeTicketProps) {
  const { user, token, refreshUser, loginDemo } = useAuth();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [price, setPrice] = useState("0.60");
  const [shares, setShares] = useState("10");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialPrice !== undefined && initialPrice > 0) {
      setPrice((initialPrice / 100).toFixed(2));
    }
  }, [initialPrice]);

  const buyingPowerDollars = user ? user.balance_cents / 100 : 10000;
  const numPrice = parseFloat(price) || 0;
  const numShares = parseInt(shares, 10) || 0;
  const totalValue = (numPrice * numShares).toFixed(2);

  const handlePercentage = (pct: number) => {
    if (numPrice <= 0) return;
    const maxShares = Math.floor(buyingPowerDollars / numPrice);
    const target = Math.max(1, Math.floor(maxShares * pct));
    setShares(target.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const priceCents = Math.round(Number(price) * 100);
    const quantity = Number(shares);

    if (side === "BUY" && Number(totalValue) > buyingPowerDollars) {
      setError(`Insufficient balance. Maximum order: $${buyingPowerDollars.toFixed(2)}`);
      setIsSubmitting(false);
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          user_id: user?.id,
          market_id: marketId,
          side,
          outcome,
          price_cents: priceCents,
          quantity,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setSuccessMsg(`Order placed: ${side} ${quantity} ${outcome} @ $${price}`);
      await refreshUser();
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
        <h2 className="text-xs font-bold tracking-widest text-zinc-500 uppercase">EXECUTE TRADE</h2>
        <div className="text-[11px] font-mono text-zinc-400">
          POWER: <span className="text-emerald-400 font-bold">${buyingPowerDollars.toFixed(2)}</span>
        </div>
      </div>

      {/* Side Toggle: BUY / SELL */}
      <div className="flex bg-zinc-950 p-1 rounded-xl mb-3 border border-white/5">
        <button
          type="button"
          onClick={() => setSide("BUY")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            side === "BUY"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          BUY
        </button>
        <button
          type="button"
          onClick={() => setSide("SELL")}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            side === "SELL"
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          SELL
        </button>
      </div>

      {/* Outcome Toggle: YES / NO */}
      <div className="flex gap-2 mb-4">
        {(["YES", "NO"] as const).map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setOutcome(o)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
              outcome === o
                ? o === "YES"
                  ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 shadow-sm"
                  : "border-rose-500/40 text-rose-400 bg-rose-500/10 shadow-sm"
                : "border-white/5 text-zinc-500 hover:text-zinc-300 bg-zinc-950/40"
            }`}
          >
            {o} OUTCOME
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 flex-grow flex flex-col">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold tracking-widest text-zinc-500 block">LIMIT PRICE ($)</label>
              <span className="text-[10px] font-mono text-zinc-400">{Math.round(numPrice * 100)}¢ Implied Odds</span>
            </div>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-white font-mono focus:outline-none focus:border-indigo-500/50"
              placeholder="0.65"
              step="0.01"
              min="0.01"
              max="0.99"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold tracking-widest text-zinc-500 block">SHARES / CONTRACTS</label>
              <div className="flex gap-1">
                {[0.25, 0.5, 0.75, 1.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentage(pct)}
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {pct === 1.0 ? "MAX" : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2 px-3 text-white font-mono focus:outline-none focus:border-indigo-500/50"
              placeholder="10"
              min="1"
              required
            />
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            ✓ {successMsg}
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex justify-between text-xs mb-3 border-t border-white/5 pt-3">
            <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Total Order Cost</span>
            <span className="text-white font-mono font-bold text-sm tabular-nums">${totalValue}</span>
          </div>

          {!user && (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => loginDemo("demo_trader")}
                className="w-full py-1.5 text-[11px] font-bold text-indigo-400 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition-colors"
              >
                Trading as Guest • Click to save to Demo Account
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-xl font-bold tracking-widest text-xs uppercase transition-all cursor-pointer shadow-lg
              ${side === "BUY" ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/10" : "bg-rose-500 hover:bg-rose-400 text-zinc-950 shadow-rose-500/10"}
              ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {isSubmitting ? "ROUTING TO CLOB..." : `PLACE ${side} ${outcome} ORDER`}
          </button>
        </div>
      </form>
    </div>
  );
}
