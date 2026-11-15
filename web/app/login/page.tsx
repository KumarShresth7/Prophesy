"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TopNav from "@/components/TopNav";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginDemo, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password);
      router.push("/markets");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid credentials. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: "demo_trader" | "liquidity_bot") => {
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo(role);
      router.push("/markets");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Demo login failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      <TopNav />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-md w-full space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-bold">
              PROP TRADING ACCESS
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Welcome Back</h1>
            <p className="text-sm text-zinc-400">Log in to execute CLOB trades and manage positions.</p>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-zinc-400">INSTANT DEMO ACCESS</span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                1-CLICK
              </span>
            </div>
            <p className="text-xs text-zinc-500">Test the high-frequency matching engine with pre-seeded test capital:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("demo_trader")}
                disabled={submitting || isLoading}
                className="p-3 bg-zinc-950 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/30 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-indigo-400">demo_trader</div>
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">$10,000 Balance</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("liquidity_bot")}
                disabled={submitting || isLoading}
                className="p-3 bg-zinc-950 hover:bg-zinc-800 border border-white/5 hover:border-indigo-500/30 rounded-xl text-left transition-all cursor-pointer group"
              >
                <div className="text-xs font-bold text-white group-hover:text-indigo-400">liquidity_bot</div>
                <div className="text-[11px] font-mono text-emerald-400 font-semibold">$50,000 Balance</div>
              </button>
            </div>
          </div>

          {/* Regular Login Form */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  USERNAME OR EMAIL
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="demo_trader or trader@example.com"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-bold tracking-widest text-zinc-400">PASSWORD</label>
                  <span className="text-[10px] text-zinc-500">demo: password123</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "AUTHENTICATING..." : "SIGN IN →"}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-white/5">
              <span className="text-xs text-zinc-500">Need an account? </span>
              <Link href="/register" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                Create Account (+$10k Grant)
              </Link>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
