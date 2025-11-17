'use client';

import Link from 'next/link';

interface PotHeaderProps {
  potId: string;
  isDarkMode: boolean;
  isCreator: boolean;
}

export function PotHeader({ potId, isDarkMode, isCreator }: PotHeaderProps) {
  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
        <div>
          <Link
            href="/pots"
            className={`text-sm font-bold mb-4 inline-block transition-opacity ${
              isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
            }`}
          >
            ← Back to Pots
          </Link>
          <h1 className="text-5xl font-black mb-2">Tech Startup Fund</h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Investment pool for emerging technology startups and innovations
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Join Pool
          </button>
          {isCreator && (
            <button
              className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 ${
                isDarkMode
                  ? 'border-white/30 text-white hover:bg-white/10'
                  : 'border-black text-black hover:bg-black/10'
              }`}
            >
              Start Cycle
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div
        className={`p-4 rounded-xl border-2 border-black ${
           isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                true ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="font-bold">Active - Cycle 5 of 12</span>
          </div>
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Created by: 0x742d35Cc...
          </span>
        </div>
      </div>
    </section>
  );
}
