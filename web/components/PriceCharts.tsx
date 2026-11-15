"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// In production, this data comes from Postgres (historical trades)
const mockData = [
  { time: '10:00', price: 45 }, { time: '10:05', price: 48 },
  { time: '10:10', price: 52 }, { time: '10:15', price: 49 },
  { time: '10:20', price: 55 }, { time: '10:25', price: 62 },
  { time: '10:30', price: 59 }, { time: '10:35', price: 65 },
];

export default function PriceChart() {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-lg h-64 md:h-80 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
      
      <h2 className="text-xs font-bold tracking-widest text-zinc-500 mb-4 flex justify-between">
        <span>YES OUTCOME PRICE HISTORY</span>
        <span className="text-emerald-400 font-mono text-sm">+14.2%</span>
      </h2>

      <div className="w-full h-48 md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ color: '#818cf8', fontFamily: 'monospace' }}
              labelStyle={{ color: '#a1a1aa', fontSize: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey="price" 
              stroke="#818cf8" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPrice)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}