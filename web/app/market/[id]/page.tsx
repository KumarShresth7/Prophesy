"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOrderBook } from "@/components/OrderBook";
import type { OrderBookData } from "@/hooks/useMarketSocket";

// FinTech widgets
import TopNav from "@/components/TopNav";
import PriceChart from "@/components/PriceCharts";
import MarketChat from "@/components/MarketChat";
import TradeTicket from "@/components/TradeTicket";
import RecentTrades from "@/components/RecentTrades";
import { useAuth } from "@/context/AuthContext";

type MarketDetail = {
  id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  resolved_outcome?: string | null;
  resolution_evidence?: string | null;
  expires_at?: string | null;
  resolved_at?: string | null;
  probability?: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default function UltimateMarketPage() {
  const params = useParams();
  const marketId = parseInt(params.id as string, 10) || 1;
  const { user } = useAuth();
  
  // Market Details
  const [market, setMarket] = useState<MarketDetail>({
    id: marketId,
    title: `Prediction Market #${marketId}`,
    description: "Loading market details...",
    category: "GENERAL",
    status: "OPEN",
  });
  const [selectedPrice, setSelectedPrice] = useState<number | undefined>(undefined);

  // Hook up our Go WebSocket engine
  const { book, trades, messages, isConnected, sendChat } = useOrderBook(marketId);
  const displayBook: OrderBookData | null = book;

  useEffect(() => {
    let ignore = false;
    const loadMarket = async () => {
      try {
        const res = await fetch(`${API_URL}/api/markets/detail?market_id=${marketId}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          setMarket(data);
        }
      } catch {
        // Fallback
      }
    };

    loadMarket();
    const interval = setInterval(loadMarket, 10000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [marketId]);

  const handleSendChat = (text: string) => {
    const username = user?.username ?? "demo_trader";
    sendChat(text, username, "SPECTATOR");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 to-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      
      {/* 1. Global Navigation & Portfolio */}
      <TopNav />

      {/* 2. Main Terminal Workspace */}
      <main className="flex-1 p-4 md:p-6 max-w-[1800px] w-full mx-auto space-y-4">
        
        {/* --- Header Widget --- */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl gap-4">
          <div className="space-y-1 max-w-4xl">
            <div className="flex items-center gap-3">
              <Link href="/markets" className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                ← ALL MARKETS
              </Link>
              <span className="text-zinc-600">•</span>
              <span className="text-xs font-mono font-bold tracking-widest text-zinc-500">
                MARKET #{market.id}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest text-indigo-400 bg-indigo-500/10 rounded border border-indigo-500/20 uppercase">
                {market.category}
              </span>
              {market.status === "RESOLVED" && (
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-widest text-purple-300 bg-purple-500/20 rounded border border-purple-500/30 uppercase">
                  RESOLVED BY ORACLE
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              {market.title}
            </h1>

            {market.description && (
              <p className="text-xs md:text-sm text-zinc-400 leading-relaxed pt-1">
                {market.description}
              </p>
            )}
          </div>
          
          <div className="mt-2 md:mt-0 flex items-center gap-3">
            <div className="flex items-center gap-2 bg-zinc-950 px-4 py-2 rounded-xl border border-white/5 shadow-inner">
              <div className="relative flex h-2 w-2">
                {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </div>
              <span className="text-xs font-mono tracking-wider text-zinc-400">
                {isConnected ? 'CLOB_SOCKET_ACTIVE' : 'RECONNECTING...'}
              </span>
            </div>
          </div>
        </header>

        {/* --- ORACLE RESOLUTION BANNER IF RESOLVED --- */}
        {market.status === "RESOLVED" && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 to-indigo-950/70 border border-purple-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest text-purple-300">
                  ⚡ AUTONOMOUS LANGGRAPH AI ORACLE VERDICT
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-mono">
                {market.resolution_evidence || "Market verified and settled according to primary source evidence."}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-zinc-400 font-mono">WINNING OUTCOME</div>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {market.resolved_outcome}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                PAID OUT $1.00 / SHARE
              </div>
            </div>
          </div>
        )}

        {/* --- THE TERMINAL GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-auto lg:h-[calc(100vh-210px)] min-h-[820px]">
          
          {/* LEFT PANEL: Chart & Order Book (Spans 6 cols) */}
          <div className="col-span-1 lg:col-span-6 flex flex-col gap-4 h-full">
            
            <div className="h-[40%] min-h-[300px]">
              <PriceChart />
            </div>
            
            {/* Live Order Book (Bids & Asks) */}
            <div className="h-[60%] grid grid-cols-1 md:grid-cols-2 gap-4">
               
               {/* ASKS (Sellers) */}
               <div className="bg-zinc-900/40 backdrop-blur-md border border-rose-500/10 rounded-2xl p-4 overflow-hidden flex flex-col relative shadow-lg">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -z-10"></div>
                 <h2 className="text-xs font-bold tracking-widest text-zinc-500 mb-2 border-b border-white/5 pb-2 flex justify-between">
                   <span>SELLERS</span>
                   <span className="text-rose-500/70 font-mono">ASKS (OFFERS)</span>
                 </h2>
                 <div className="flex justify-between text-[10px] font-bold tracking-widest text-zinc-600 mb-2 px-2">
                   <span>PRICE</span>
                   <span>QTY</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                   {displayBook?.asks?.map((ask, i) => (
                     <div
                       key={i}
                       onClick={() => setSelectedPrice(ask.price)}
                       className="flex justify-between items-center py-1.5 px-2 hover:bg-rose-500/20 rounded group cursor-pointer transition-colors font-mono text-sm tabular-nums"
                       title="Click to copy price to trade ticket"
                     >
                       <span className="text-rose-400 font-semibold">${(ask.price / 100).toFixed(2)}</span>
                       <span className="text-zinc-300">{ask.quantity}</span>
                     </div>
                   ))}
                   {(!displayBook?.asks || displayBook.asks.length === 0) && (
                     <div className="text-zinc-600 text-sm py-8 text-center italic font-sans">Awaiting liquidity...</div>
                   )}
                 </div>
               </div>

               {/* BIDS (Buyers) */}
               <div className="bg-zinc-900/40 backdrop-blur-md border border-emerald-500/10 rounded-2xl p-4 overflow-hidden flex flex-col relative shadow-lg">
                 <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>
                 <h2 className="text-xs font-bold tracking-widest text-zinc-500 mb-2 border-b border-white/5 pb-2 flex justify-between">
                   <span className="text-emerald-500/70 font-mono">BIDS</span>
                   <span>BUYERS</span>
                 </h2>
                 <div className="flex justify-between text-[10px] font-bold tracking-widest text-zinc-600 mb-2 px-2">
                   <span>QTY</span>
                   <span>PRICE</span>
                 </div>
                 <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
                   {displayBook?.bids?.map((bid, i) => (
                     <div
                       key={i}
                       onClick={() => setSelectedPrice(bid.price)}
                       className="flex justify-between items-center py-1.5 px-2 hover:bg-emerald-500/20 rounded group cursor-pointer transition-colors font-mono text-sm tabular-nums"
                       title="Click to copy price to trade ticket"
                     >
                       <span className="text-zinc-300">{bid.quantity}</span>
                       <span className="text-emerald-400 font-semibold">${(bid.price / 100).toFixed(2)}</span>
                     </div>
                   ))}
                   {(!displayBook?.bids || displayBook.bids.length === 0) && (
                     <div className="text-zinc-600 text-sm py-8 text-center italic font-sans">Awaiting liquidity...</div>
                   )}
                 </div>
               </div>

            </div>
          </div>

          {/* MIDDLE PANEL: Community Terminal Chat (Spans 3 cols) */}
          <div className="col-span-1 lg:col-span-3 h-[500px] lg:h-full">
             <MarketChat messages={messages} onSend={handleSendChat} />
          </div>

          {/* RIGHT PANEL: Execution Ticket & Tape (Spans 3 cols) */}
          <div className="col-span-1 lg:col-span-3 flex flex-col gap-4 h-full">
            {/* The Buy/Sell Engine */}
            <div className="shrink-0">
              <TradeTicket marketId={marketId} initialPrice={selectedPrice} />
            </div>
            
            {/* The Live Global Trades Feed */}
            <div className="flex-1 min-h-[250px]">
               <RecentTrades trades={trades} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
