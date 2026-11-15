"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";

type Market = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  resolved_outcome?: string;
  resolution_evidence?: string;
  expires_at?: string;
  probability: number;
  volume_cents: number;
};

const SEED_MARKETS: Market[] = [
  { id: 1, title: "Will SpaceX launch Starship by Friday?", description: "Resolves YES if SpaceX successfully launches Starship before expiry.", category: "AEROSPACE", status: "OPEN", probability: 62, volume_cents: 120000000 },
  { id: 2, title: "Ethereum ETF approved by SEC before July?", description: "Resolves YES if SEC approves spot Ethereum ETF.", category: "CRYPTO", status: "OPEN", probability: 28, volume_cents: 540000000 },
  { id: 3, title: "GPT-5 released before December 2024?", description: "Resolves YES if OpenAI publicly launches GPT-5.", category: "AI & TECH", status: "OPEN", probability: 85, volume_cents: 89000000 },
  { id: 4, title: "Federal Reserve cuts interest rates in next FOMC meeting?", description: "Resolves YES if the Fed cuts interest rates.", category: "ECONOMY", status: "OPEN", probability: 12, volume_cents: 320000000 },
  { id: 5, title: "Nvidia (NVDA) stock closes above $1500 this year?", description: "Resolves YES if NVDA closes above $1500.", category: "FINANCE", status: "OPEN", probability: 45, volume_cents: 210000000 },
  { id: 6, title: "US Presidential Election 2024: Winner", description: "Resolves YES if Democratic candidate wins.", category: "POLITICS", status: "OPEN", probability: 51, volume_cents: 1250000000 },
];

const CATEGORIES = ["ALL", "CRYPTO", "POLITICS", "AI & TECH", "ECONOMY", "AEROSPACE", "FINANCE"];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function MarketsPage() {
  const { token } = useAuth();
  const [markets, setMarkets] = useState<Market[]>(SEED_MARKETS);
  const [activeTab, setActiveTab] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "RESOLVED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Market Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("CRYPTO");
  const [newDays, setNewDays] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/markets`);
      if (res.ok) {
        const data: Market[] = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMarkets(data);
        }
      }
    } catch {
      // Keep seed markets on failure
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const timer = setInterval(fetchMarkets, 10000);
    return () => clearInterval(timer);
  }, [fetchMarkets]);

  const handleCreateMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/api/markets`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          category: newCategory,
          days: Number(newDays),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      setIsModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      await fetchMarkets();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError("Failed to create market");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const filteredMarkets = markets.filter((m) => {
    const matchesCategory = activeTab === "ALL" || m.category.toUpperCase().includes(activeTab);
    const matchesStatus = statusFilter === "ALL" || m.status === statusFilter;
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      <TopNav />

      <main className="flex-1 p-4 md:p-8 max-w-[1700px] w-full mx-auto space-y-8">
        
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-widest text-zinc-500 uppercase">HIGH-FREQUENCY CLOB</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Prediction Markets</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Live binary options matching on sub-millisecond Redis order books. Settle automatically with the AI Oracle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg leading-none">+</span>
              Create Market
            </button>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveTab(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-widest transition-all cursor-pointer ${
                  activeTab === cat
                    ? "bg-white text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
                    : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search predictions..."
                className="w-full bg-zinc-900/70 border border-white/10 rounded-xl py-2 px-3.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex bg-zinc-900/60 p-1 rounded-xl border border-white/5">
              {(["ALL", "OPEN", "RESOLVED"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    statusFilter === s
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Markets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMarkets.map((market) => {
            const probYes = market.probability || 50;
            const probNo = 100 - probYes;
            const vol = market.volume_cents > 0
              ? `$${(market.volume_cents / 100000).toFixed(1)}k`
              : "$1.2M";

            return (
              <Link href={`/market/${market.id}`} key={market.id}>
                <div className="group bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 hover:border-indigo-500/40 hover:bg-zinc-900/70 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full shadow-lg">
                  
                  {/* Subtle Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/0 rounded-full blur-3xl -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>

                  {/* Header Badge & Volume */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold tracking-widest text-zinc-400 bg-zinc-800/80 rounded-md border border-white/5 uppercase">
                      {market.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-zinc-500">VOL {vol}</span>
                      {market.status === "OPEN" ? (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold font-mono rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {market.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-indigo-200 transition-colors">
                    {market.title}
                  </h3>
                  {market.description && (
                    <p className="text-xs text-zinc-400 line-clamp-2 mb-6">
                      {market.description}
                    </p>
                  )}

                  {/* Resolution Banner if resolved */}
                  {market.status === "RESOLVED" && (
                    <div className="mt-auto mb-4 p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300">RESOLVED BY AI ORACLE</span>
                      <span className="font-extrabold font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                        {market.resolved_outcome}
                      </span>
                    </div>
                  )}

                  {/* Probability Bar */}
                  <div className="mt-auto pt-4 border-t border-white/5">
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-emerald-400 font-mono">{probYes}% YES</span>
                      <span className="text-rose-400 font-mono">{probNo}% NO</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        style={{ width: `${probYes}%` }}
                        className="bg-emerald-500 transition-all duration-500"
                      ></div>
                      <div
                        style={{ width: `${probNo}%` }}
                        className="bg-rose-500 transition-all duration-500"
                      ></div>
                    </div>
                  </div>

                  {/* Quick Action Footer */}
                  <div className="mt-4 flex items-center justify-between text-xs pt-2">
                    <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors font-mono">
                      Market #{market.id}
                    </span>
                    <span className="font-bold text-indigo-400 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Trade CLOB →
                    </span>
                  </div>

                </div>
              </Link>
            );
          })}

          {filteredMarkets.length === 0 && (
            <div className="col-span-full p-12 text-center bg-zinc-900/30 rounded-2xl border border-white/5">
              <p className="text-zinc-400 text-sm mb-4">No prediction markets match your current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("ALL");
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Create Market Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h2 className="text-lg font-bold text-white">Create Prediction Market</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white text-xl leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateMarket} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  MARKET QUESTION / PROPOSITION
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Will SpaceX launch Starship Flight 6 this month?"
                  required
                  minLength={5}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  RESOLUTION CRITERIA & EVIDENCE DETAILS
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Precise conditions for the autonomous AI Oracle to verify via live web search..."
                  rows={3}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="POLITICS">POLITICS</option>
                    <option value="AI & TECH">AI & TECH</option>
                    <option value="ECONOMY">ECONOMY</option>
                    <option value="AEROSPACE">AEROSPACE</option>
                    <option value="FINANCE">FINANCE</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                    EXPIRY (DAYS)
                  </label>
                  <input
                    type="number"
                    value={newDays}
                    onChange={(e) => setNewDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-950 rounded-xl border border-white/5 text-[11px] text-zinc-400">
                ⚡ Initial liquidity will be seeded automatically by the liquidity engine.
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.4)]"
                >
                  {isCreating ? "Publishing..." : "Launch Market →"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
