"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TopNav() {
  const pathname = usePathname();
  const { user, logout, loginDemo, claimFaucet } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  const handleFaucet = async () => {
    setFaucetLoading(true);
    try {
      await claimFaucet();
      setFaucetSuccess(true);
      setTimeout(() => setFaucetSuccess(false), 2000);
    } finally {
      setFaucetLoading(false);
    }
  };

  const balanceFormatted = user
    ? `$${(user.balance_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "$10,000.00";

  return (
    <nav className="w-full bg-zinc-950/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo / Brand + Nav Links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:scale-105 transition-transform">
                <span className="font-black text-white text-lg tracking-tighter">P</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                  PROPHESY
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    CLOB
                  </span>
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/markets"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                  pathname === "/markets" || pathname.startsWith("/market/")
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                MARKETS
              </Link>
              <Link
                href="/leaderboard"
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                  pathname === "/leaderboard"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                LEADERBOARD
              </Link>
              {user && (
                <Link
                  href="/portfolio"
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${
                    pathname === "/portfolio"
                      ? "bg-white/10 text-white"
                      : "text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  PORTFOLIO
                </Link>
              )}
            </div>
          </div>

          {/* User Financials & Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            
            {user ? (
              <>
                {/* Free Faucet Button */}
                <button
                  type="button"
                  onClick={handleFaucet}
                  disabled={faucetLoading}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all cursor-pointer"
                  title="Claim $1,000 in test trading funds"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  {faucetLoading ? "MINTING..." : faucetSuccess ? "+$1,000 ADDED!" : "+$1,000 FAUCET"}
                </button>

                {/* User Financials Badge */}
                <div className="flex items-center gap-4 bg-zinc-900/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 shadow-inner">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-bold tracking-widest text-zinc-500">BUYING POWER</span>
                    <span className="text-sm font-mono font-bold text-white tabular-nums">
                      {balanceFormatted}
                    </span>
                  </div>

                  <div className="w-px h-7 bg-white/10"></div>

                  {/* Profile Dropdown Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center gap-2 focus:outline-none cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border border-white/20 flex items-center justify-center font-bold text-white text-xs shadow-md">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="hidden lg:block text-xs font-semibold text-zinc-300 max-w-[100px] truncate">
                        {user.username}
                      </span>
                      <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div
                        className="absolute right-0 mt-3 w-64 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 text-left animate-in fade-in zoom-in-95 duration-100"
                        onMouseLeave={() => setDropdownOpen(false)}
                      >
                        <div className="p-3 border-b border-white/5">
                          <p className="text-xs font-bold text-white truncate">{user.username}</p>
                          <p className="text-[10px] text-zinc-400 font-mono truncate">{user.email || user.id}</p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            {user.role} ACCOUNT
                          </div>
                        </div>

                        <div className="py-1">
                          <Link
                            href="/portfolio"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            <span>Portfolio & Positions</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              handleFaucet();
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left flex items-center justify-between px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          >
                            <span>Add $1,000 Test Funds</span>
                            <span className="font-mono text-[10px]">+1,000</span>
                          </button>
                        </div>

                        <div className="pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              loginDemo("demo_trader");
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            Switch to Demo Trader ($10k)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              loginDemo("liquidity_bot");
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            Switch to Liquidity Bot ($50k)
                          </button>
                        </div>

                        <div className="pt-1 border-t border-white/5">
                          <button
                            type="button"
                            onClick={() => {
                              logout();
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          >
                            Log Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Logged Out Actions */
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => loginDemo("demo_trader")}
                  className="hidden sm:inline-flex px-3 py-2 text-xs font-bold tracking-wider text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
                >
                  QUICK DEMO
                </button>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2 text-xs font-bold tracking-wider text-zinc-300 hover:text-white transition-colors"
                >
                  LOG IN
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 sm:px-4 py-2 text-xs font-bold tracking-wider bg-white text-zinc-950 rounded-lg hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                >
                  SIGN UP
                </Link>
              </div>
            )}

          </div>

        </div>
      </div>
    </nav>
  );
}
