'use client';

import { useState } from 'react';

interface YieldCardProps {
  isDarkMode: boolean;
}

export function YieldCard({ isDarkMode }: YieldCardProps) {
  const [activeTime, setActiveTime] = useState('month');

  return (
    <section className="py-8">
      <div className={`border-3 border-black rounded-3xl p-8 backdrop-blur transition-colors space-y-6 ${
        isDarkMode ? 'bg-white/5' : 'bg-white/90'
      } `}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Yield Earned</h3>
            <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>$1,450</p>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>This Month Lady</p>
          </div>
          <div className="flex gap-2">
            {['7 Days', '2 Weeks', '4 Weeks', '3 Months'].map((time) => (
              <button
                key={time}
                onClick={() => setActiveTime(time)}
                className={`text-xs px-3 py-1 rounded-full transition-colors ${
                  activeTime === time
                    ? isDarkMode
                      ? 'bg-white text-black'
                      : 'bg-black text-white'
                    : isDarkMode
                    ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                    : 'bg-white border border-black/20 text-black hover:bg-black/5'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <svg viewBox="0 0 400 120" className="w-full h-20" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.08))">
            <defs>
              <linearGradient id="yieldAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="yieldLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <polygon
              points="0,90 40,75 80,65 120,55 160,45 200,40 240,38 280,35 320,32 360,30 400,28 400,120 0,120"
              fill="url(#yieldAreaGradient)"
            />
            <polyline
              points="0,90 40,75 80,65 120,55 160,45 200,40 240,38 280,35 320,32 360,30 400,28"
              fill="none"
              stroke="url(#yieldLineGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className={`flex justify-between text-xs ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>

        {/* Stats */}
        <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <div className="space-y-1">
            <p className={`text-xs ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Previous Month</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>$1,150</p>
            <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>↑ 13% growth</p>
          </div>
        </div>
      </div>
    </section>
  );
}
