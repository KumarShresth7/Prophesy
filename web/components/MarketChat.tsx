"use client";

import { useState } from "react";
import type { ChatMessage } from "@/hooks/useMarketSocket";

const SEED_MESSAGES: ChatMessage[] = [
  { id: "1", user: "0xA1...4f", text: "FAA just cleared the airspace. It's happening.", stance: "YES", time: "10:42 AM" },
  { id: "2", user: "0x9B...2a", text: "Weather looks terrible though, wind speeds are too high.", stance: "NO", time: "10:44 AM" },
];

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => void;
};

export default function MarketChat({ messages, onSend }: Props) {
  const [newMessage, setNewMessage] = useState("");
  const display = messages.length > 0 ? messages : SEED_MESSAGES;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSend(newMessage.trim());
    setNewMessage("");
  };

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl flex flex-col h-full overflow-hidden shadow-lg">
      <div className="p-4 border-b border-white/5 bg-zinc-950/50">
        <h2 className="text-xs font-bold tracking-widest text-zinc-500 mb-3 flex justify-between items-center">
          <span>COMMUNITY TERMINAL</span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
        </h2>
        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500 w-[70%]"></div>
          <div className="h-full bg-rose-500 w-[30%]"></div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {display.map((msg) => (
          <div key={msg.id ?? msg.time + msg.user} className="group">
            <div className="flex items-baseline justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-300">{msg.user}</span>
                <span
                  className={`text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded ${
                    msg.stance === "YES"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : msg.stance === "NO"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-zinc-800 text-zinc-500 border border-white/5"
                  }`}
                >
                  {msg.stance === "SPECTATOR" ? "NO POSITION" : `HOLDS ${msg.stance}`}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 font-mono">{msg.time}</span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">{msg.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-zinc-950 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Share your thesis..."
          className="flex-1 bg-zinc-900 border border-white/5 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors placeholder:text-zinc-600"
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors">
          Send
        </button>
      </form>
    </div>
  );
}
