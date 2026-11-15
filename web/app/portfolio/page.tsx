"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";

type Position = {
  market_id: number;
  market_title: string;
  market_status: string;
  outcome: "YES" | "NO";
  shares: number;
  avg_price_cents: number;
};

type OpenOrder = {
  id: string;
  market_id: number;
  market_title: string;
  side: "BUY" | "SELL";
  outcome: "YES" | "NO";
  price_cents: number;
  quantity: number;
  filled_quantity: number;
  status: string;
  created_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function PortfolioPage() {
  const { user, token, claimFaucet } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<OpenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/user/portfolio`, { headers });
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load portfolio:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  const handleCancelOrder = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/orders/cancel`, {
        method: "POST",
        headers,
        body: JSON.stringify({ order_id: orderId }),
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      }
    } catch (err) {
      console.error("Failed to cancel order:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const balance = user?.balance_cents ?? 1000000;
  const positionsCost = positions.reduce((acc, p) => acc + (p.shares * p.avg_price_cents), 0);
  const netWorth = balance + positionsCost;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-100 font-sans flex flex-col">
      <TopNav />

      <main className="flex-1 p-4 md:p-8 max-w-[1500px] w-full mx-auto space-y-8">
        
        {/* Header and Summary Cards */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest text-zinc-500">TRADER PORTFOLIO</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {user?.role ?? "TRADER"}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              {user?.username ?? "demo_trader"}
            </h1>
          </div>

          <button
            type="button"
            onClick={claimFaucet}
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Mint +$1,000 Free Funds
          </button>
        </div>

        {/* Portfolio Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="text-xs font-bold tracking-widest text-zinc-500 mb-2">TOTAL NET WORTH</div>
            <div className="text-3xl font-mono font-bold text-white tabular-nums">
              ${(netWorth / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">Cash + Estimated Portfolio Value</div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="text-xs font-bold tracking-widest text-zinc-500 mb-2">AVAILABLE BUYING POWER</div>
            <div className="text-3xl font-mono font-bold text-emerald-400 tabular-nums">
              ${(balance / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">Ready to execute new limit or market orders</div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="text-xs font-bold tracking-widest text-zinc-500 mb-2">ACTIVE POSITIONS CAPITAL</div>
            <div className="text-3xl font-mono font-bold text-indigo-400 tabular-nums">
              ${(positionsCost / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-500 mt-2">Invested across {positions.length} prediction market outcomes</div>
          </div>
        </div>

        {/* Active Positions Section */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">Active Market Positions</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400">
                {positions.length}
              </span>
            </div>
            <Link href="/markets" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
              Browse Markets →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/40 border-b border-white/5 text-[10px] font-bold tracking-widest text-zinc-500">
                  <th className="p-4">MARKET</th>
                  <th className="p-4">OUTCOME</th>
                  <th className="p-4 text-right">SHARES</th>
                  <th className="p-4 text-right">AVG ENTRY</th>
                  <th className="p-4 text-right">TOTAL COST</th>
                  <th className="p-4 text-right">STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-sm">
                {positions.map((p) => {
                  const cost = (p.shares * p.avg_price_cents) / 100;
                  return (
                    <tr key={`${p.market_id}-${p.outcome}`} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-sans font-semibold text-white max-w-md">
                        <Link href={`/market/${p.market_id}`} className="hover:text-indigo-400 transition-colors">
                          {p.market_title}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 text-xs font-bold rounded ${
                            p.outcome === "YES"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {p.outcome}
                        </span>
                      </td>
                      <td className="p-4 text-right text-zinc-200 tabular-nums">{p.shares}</td>
                      <td className="p-4 text-right text-zinc-300 tabular-nums">${(p.avg_price_cents / 100).toFixed(2)}</td>
                      <td className="p-4 text-right text-white font-bold tabular-nums">${cost.toFixed(2)}</td>
                      <td className="p-4 text-right font-sans text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.market_status === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : "bg-purple-500/10 text-purple-400"}`}>
                          {p.market_status}
                        </span>
                      </td>
                      <td className="p-4 text-right font-sans">
                        <Link
                          href={`/market/${p.market_id}`}
                          className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white rounded-lg transition-colors inline-block"
                        >
                          Trade
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {positions.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 font-sans italic">
                      No active positions yet. Explore the{" "}
                      <Link href="/markets" className="text-indigo-400 underline font-semibold">
                        Markets Terminal
                      </Link>{" "}
                      to place your first prediction trade!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resting Orders Section */}
        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-widest text-white uppercase">Resting Limit Orders</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-400">
                {orders.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-950/40 border-b border-white/5 text-[10px] font-bold tracking-widest text-zinc-500">
                  <th className="p-4">MARKET</th>
                  <th className="p-4">SIDE</th>
                  <th className="p-4">OUTCOME</th>
                  <th className="p-4 text-right">LIMIT PRICE</th>
                  <th className="p-4 text-right">QTY / FILLED</th>
                  <th className="p-4 text-right">STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-sm">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 font-sans font-semibold text-white max-w-md">
                      <Link href={`/market/${o.market_id}`} className="hover:text-indigo-400 transition-colors">
                        {o.market_title}
                      </Link>
                    </td>
                    <td className="p-4 font-bold text-xs">
                      <span className={o.side === "BUY" ? "text-emerald-400" : "text-rose-400"}>
                        {o.side}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-bold text-zinc-300">{o.outcome}</td>
                    <td className="p-4 text-right text-white font-bold tabular-nums">
                      ${(o.price_cents / 100).toFixed(2)}
                    </td>
                    <td className="p-4 text-right text-zinc-300 tabular-nums">
                      {o.filled_quantity} / {o.quantity}
                    </td>
                    <td className="p-4 text-right font-sans text-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-right font-sans">
                      <button
                        type="button"
                        onClick={() => handleCancelOrder(o.id)}
                        disabled={cancellingId === o.id}
                        className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                      >
                        {cancellingId === o.id ? "Cancelling..." : "Cancel"}
                      </button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500 font-sans italic">
                      No resting orders in the CLOB matching queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
