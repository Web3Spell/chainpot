'use client';

import { useState } from 'react';

interface StatsCardsProps {
  isDarkMode: boolean;
}

export function StatsCards({ isDarkMode }: StatsCardsProps) {
  const [activeTime, setActiveTime] = useState('7days');

  return (
    <section className="py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pools Card */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${
          isDarkMode ? 'bg-white/5' : 'bg-white/90'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Total Pools</h3>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-purple-500/30 text-white' : 'bg-purple-200 text-black'}`}>Active (4)</span>
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-500/30 text-white' : 'bg-gray-200 text-black'}`}>Completed (6)</span>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkMode ? '#ffffff15' : '#f3e8ff'} strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#donutGradient)"
                    strokeWidth="12"
                    strokeDasharray="70 100"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="50%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#e9d5ff" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Contributions Line Chart Card */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${
          isDarkMode ? 'bg-white/5' : 'bg-white/90'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Active Contributions</h3>
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
                        ? 'bg-white/10 border text-white hover:bg-white/20'
                        : 'bg-white border border-black/20 text-black hover:bg-black/5'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>$420</p>
              <svg viewBox="0 0 300 100" className="w-full h-16" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))">
                <polyline
                  points="0,80 30,70 60,60 90,50 120,45 150,40 180,35 210,30 240,28 270,25 300,20"
                  fill="none"
                  stroke="url(#lineChartGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,80 30,70 60,60 90,50 120,45 150,40 180,35 210,30 240,28 270,25 300,20"
                  fill="url(#areaGradient)"
                />
                <defs>
                  <linearGradient id="lineChartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Active Contributions Bar Chart */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${
          isDarkMode ? 'bg-white/5' : 'bg-white/90'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Active Contributions</h3>
              <div className="flex gap-2">
                {['7 Days', '2 Weeks', '4 Weeks', '3 Months'].map((time) => (
                  <button
                    key={time}
                    className={`text-xs px-3 py-1 rounded-full hover:transition-colors ${
                      isDarkMode
                        ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                        : 'bg-white border border-black/20 text-black hover:bg-black/5'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>$420</p>
              <div className="flex items-end justify-around h-24 gap-1">
                {[40, 60, 70, 50, 80, 65].map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <p className={`text-xs text-center ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Month1 Month2 Month3 Month4 Month5 Month6</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
