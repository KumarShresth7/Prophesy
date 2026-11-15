"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import { useAuth } from "@/context/AuthContext";

export default function LandingPage() {
  const router = useRouter();
  const { user, loginDemo } = useAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleStartTrading = async () => {
    if (!user) {
      await loginDemo("demo_trader");
    }
    router.push("/markets");
  };

  const FAQS = [
    {
      q: "What is Prophesy?",
      a: "Prophesy is an institutional-grade, high-frequency prediction market. Users trade binary YES/NO shares on real-world events across crypto, technology, macroeconomics, and politics with sub-millisecond execution.",
    },
    {
      q: "How does the Central Limit Order Book (CLOB) work?",
      a: "Unlike automated market maker (AMM) bonding curves, Prophesy uses a true Central Limit Order Book written in Go. Resting limit orders are ordered by price-time priority in Redis Sorted Sets, matching fills in under 2 milliseconds.",
    },
    {
      q: "How does the LangGraph AI Oracle settle markets?",
      a: "When a market expires, an autonomous LangGraph agent conducts live web search via DuckDuckGo, synthesizes multiple primary sources using GPT-4o, runs a secondary verification step, and generates a deterministic JSON verdict that automatically triggers smart payouts.",
    },
    {
      q: "Can I try Prophesy without risking real money?",
      a: "Yes! Every new account is instantly credited with $10,000 in paper trading capital. You can also click 'Quick Demo' to jump directly into trading with zero signup required, plus claim free test funds anytime using the Faucet.",
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden flex flex-col">
      <TopNav />

      {/* --- HERO SECTION --- */}
      <section className="relative pt-16 pb-24 md:pt-28 md:pb-36 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        
        {/* Ambient Gradient Backgrounds */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] md:w-[1000px] h-[400px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-emerald-500/10 rounded-full blur-[140px] -z-10 pointer-events-none"></div>

        {/* Live Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-900/80 border border-white/10 mb-8 backdrop-blur-md shadow-xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-300">
            PROP ENGINE V2.0 LIVE • 2MS CLOB MATCHING • AI SETTLEMENT
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white mb-6 leading-[1.08]">
          Trade on <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-emerald-400">Reality.</span>
          <br />
          Settle with <span className="underline decoration-indigo-500/40 underline-offset-8">AI.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-zinc-400 max-w-3xl mx-auto mb-10 font-normal leading-relaxed">
          The high-frequency binary prediction market engineered for sub-millisecond execution. Trade global events, harvest alpha on a Go CLOB, and let an autonomous LangGraph AI Oracle settle the truth.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/markets"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold tracking-wider text-xs uppercase bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            Launch Terminal →
          </Link>
          <button
            type="button"
            onClick={handleStartTrading}
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-extrabold tracking-wider text-xs uppercase bg-zinc-900/90 border border-white/15 text-white hover:bg-zinc-800 transition-all hover:scale-[1.02] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>⚡ Try Demo ($10k)</span>
          </button>
        </div>

        {/* Live Stats Bar */}
        <div className="mt-16 sm:mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1">24H TRADING VOLUME</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">$24.8M</div>
          </div>
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1">MEAN CLOB LATENCY</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-emerald-400 tabular-nums">&lt; 2.1 ms</div>
          </div>
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1">ACTIVE MARKETS</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-indigo-400 tabular-nums">142</div>
          </div>
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg">
            <div className="text-[10px] font-bold tracking-widest text-zinc-500 mb-1">ORACLE ACCURACY</div>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">99.8%</div>
          </div>
        </div>

      </section>

      {/* --- FEATURED LIVE MARKETS TICKER --- */}
      <section className="py-12 bg-zinc-900/20 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">TRENDING PREDICTION MARKETS</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <Link href="/markets" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
              View All 142 Markets →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                id: 1,
                title: "Will SpaceX launch Starship by Friday?",
                category: "AEROSPACE",
                prob: 62,
                vol: "$1.2M",
              },
              {
                id: 2,
                title: "Ethereum ETF approved by SEC before July?",
                category: "CRYPTO",
                prob: 28,
                vol: "$5.4M",
              },
              {
                id: 3,
                title: "GPT-5 released before December 2024?",
                category: "AI & TECH",
                prob: 85,
                vol: "$890K",
              },
            ].map((m) => (
              <Link href={`/market/${m.id}`} key={m.id}>
                <div className="bg-zinc-900/50 hover:bg-zinc-900/80 border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 transition-all group flex flex-col h-full shadow-lg">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded border border-white/5">
                      {m.category}
                    </span>
                    <span className="text-xs font-mono text-zinc-500">VOL {m.vol}</span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-4 line-clamp-2 group-hover:text-indigo-300 transition-colors">
                    {m.title}
                  </h4>

                  <div className="mt-auto">
                    <div className="flex justify-between text-xs font-bold font-mono mb-2">
                      <span className="text-emerald-400">{m.prob}% YES</span>
                      <span className="text-rose-400">{100 - m.prob}% NO</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                      <div style={{ width: `${m.prob}%` }} className="bg-emerald-500"></div>
                      <div style={{ width: `${100 - m.prob}%` }} className="bg-rose-500"></div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* --- ARCHITECTURE & TECH STACK SHOWCASE --- */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-2">SYSTEM ARCHITECTURE</div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Engineered for Milliseconds, Guaranteed by Cryptography.
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base">
            Every layer of Prophesy is built from first principles for uncompromising execution speed, financial safety, and objective settlement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Go CLOB */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 hover:border-indigo-500/30 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 uppercase mb-1">LAYER 01 • EXECUTION</div>
            <h3 className="text-xl font-bold text-white mb-3">Go CLOB Matching Engine</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Written in Go and powered by Redis Sorted Sets (ZSET), our Central Limit Order Book matches resting bids and asks at price-time priority in under 2ms.
            </p>
            <ul className="text-xs text-zinc-500 space-y-1.5 font-mono">
              <li>• Sub-ms ZRangeByScore queries</li>
              <li>• Atomic maker-taker execution</li>
              <li>• Automatic member eviction</li>
            </ul>
          </div>

          {/* Card 2: Postgres Vault */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 hover:border-emerald-500/30 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase mb-1">LAYER 02 • LEDGER</div>
            <h3 className="text-xl font-bold text-white mb-3">Row-Locked PostgreSQL Vault</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Financial balances, resting orders, and executed trades are guarded with strict <code className="text-emerald-400 font-mono">SELECT FOR UPDATE</code> row-level transactions.
            </p>
            <ul className="text-xs text-zinc-500 space-y-1.5 font-mono">
              <li>• Zero double-spend guarantees</li>
              <li>• Instant winner payout settlement</li>
              <li>• Fully auditable trade history</li>
            </ul>
          </div>

          {/* Card 3: LangGraph AI Oracle */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-8 hover:border-purple-500/30 transition-all shadow-xl group">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-[10px] font-mono font-bold tracking-widest text-purple-400 uppercase mb-1">LAYER 03 • SETTLEMENT</div>
            <h3 className="text-xl font-bold text-white mb-3">LangGraph Autonomous Oracle</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Autonomous multi-agent research pipeline that scrapes DuckDuckGo snippets, synthesizes proof via GPT-4o, and verifies deterministic JSON payouts.
            </p>
            <ul className="text-xs text-zinc-500 space-y-1.5 font-mono">
              <li>• Multi-agent search & reasoning</li>
              <li>• Secondary verification pass</li>
              <li>• Deterministic payout execution</li>
            </ul>
          </div>

        </div>

      </section>

      {/* --- HOW IT WORKS: 4 SIMPLE STEPS --- */}
      <section className="py-20 bg-zinc-900/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-xs font-bold tracking-widest text-emerald-400 uppercase mb-2">SIMPLE WORKFLOW</div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              How Prophesy Works
            </h2>
            <p className="text-zinc-400 text-sm">
              Trade binary options contracts where each share resolves to either $1.00 (winning) or $0.00 (losing).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Pick Your Market",
                desc: "Choose from active events across Crypto, Macroeconomics, Tech, Aerospace, and Politics.",
              },
              {
                step: "02",
                title: "Execute Order",
                desc: "Place resting limit bids/asks or execute market orders against resting liquidity in the CLOB.",
              },
              {
                step: "03",
                title: "Oracle Resolves",
                desc: "Upon market expiry, the autonomous AI Oracle scans primary web sources to establish the verifiable truth.",
              },
              {
                step: "04",
                title: "Instant Payout",
                desc: "Winning shares automatically redeem for $1.00 each into your balance with zero manual claims.",
              },
            ].map((s) => (
              <div key={s.step} className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 relative">
                <div className="text-3xl font-black font-mono text-zinc-800 mb-3">{s.step}</div>
                <h4 className="text-lg font-bold text-white mb-2">{s.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* --- FAQS ACCORDION --- */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <div className="text-xs font-bold tracking-widest text-indigo-400 uppercase mb-2">FREQUENTLY ASKED QUESTIONS</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Everything You Need to Know
          </h2>
        </div>

        <div className="space-y-4">
          {FAQS.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={faq.q}
                className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left flex justify-between items-center gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                >
                  <span className="text-base font-bold text-white">{faq.q}</span>
                  <span className="text-xl font-mono text-zinc-400 leading-none">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm text-zinc-400 leading-relaxed border-t border-white/5 bg-zinc-950/30">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* --- BOTTOM CALL TO ACTION BANNER --- */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-zinc-900/50 border border-indigo-500/20 rounded-3xl p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
          
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Ready to trade the future?
          </h2>
          <p className="text-zinc-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            Create your account in seconds and receive $10,000 in paper trading funds to experience sub-millisecond CLOB execution.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-4 bg-white text-zinc-950 hover:bg-zinc-200 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(255,255,255,0.2)]"
            >
              Sign Up & Claim $10k →
            </Link>
            <Link
              href="/markets"
              className="px-8 py-4 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all"
            >
              Explore Markets
            </Link>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="mt-auto border-t border-white/5 bg-zinc-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-black text-xs">
              P
            </div>
            <span className="font-extrabold text-white tracking-tight">PROPHESY CLOB</span>
            <span>• High-Frequency Prediction Markets</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <Link href="/markets" className="hover:text-white transition-colors">Markets</Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
            <Link href="/portfolio" className="hover:text-white transition-colors">Portfolio</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
          </div>

          <div className="font-mono text-[11px] text-zinc-600">
            ENGINE V2.0 • ALL SYSTEMS OPERATIONAL
          </div>
        </div>
      </footer>

    </div>
  );
}
