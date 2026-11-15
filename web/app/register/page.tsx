"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import TopNav from "@/components/TopNav";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginDemo, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await register(username, email, password);
      router.push("/markets");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-zinc-100 flex flex-col font-sans">
      <TopNav />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-indigo-600/15 rounded-full blur-[120px] -z-10"></div>
        <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-emerald-600/10 rounded-full blur-[120px] -z-10"></div>

        <div className="max-w-md w-full space-y-6">
          
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
              $10,000 DEMO CAPITAL GRANT
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Open Trading Account</h1>
            <p className="text-sm text-zinc-400">Join Prophesy to trade binary prediction markets in real-time.</p>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-2xl space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  TRADING ALIAS / USERNAME
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. satoshi_trader"
                  required
                  minLength={3}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@example.com"
                  required
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  PASSWORD (MIN 6 CHARACTERS)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-zinc-400 block mb-1">
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="p-3 bg-zinc-950/80 rounded-xl border border-white/5 text-[11px] text-zinc-400 flex items-center gap-2">
                <span className="text-emerald-400 font-bold text-sm">✓</span>
                Your new account will be instantly credited with <span className="text-white font-bold font-mono">$10,000.00</span> in paper trading capital.
              </div>

              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "CREATING ACCOUNT..." : "CREATE ACCOUNT & CLAIM $10K →"}
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-zinc-500">Already have an account?</span>
              <Link href="/login" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                Log In
              </Link>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={async () => {
                await loginDemo("demo_trader");
                router.push("/markets");
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4"
            >
              Skip sign up and launch instant Demo Trader
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
