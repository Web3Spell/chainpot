'use client';

import Link from 'next/link';

interface PotsHeroProps {
  isDarkMode: boolean;
}

export function PotsHero({ isDarkMode }: PotsHeroProps) {
  return (
    <section className="mb-12">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-5xl md:text-6xl font-black mb-4">
            <span className="block underline decoration-2 underline-offset-4">Browse</span>
            <span className="block underline decoration-2 underline-offset-4">All Pots</span>
          </h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Discover and join available ROSCA pools. Find the perfect investment opportunity.
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="text"
            placeholder="Search pots by name..."
            className={`flex-1 px-6 py-3 rounded-full border-3 transition-colors duration-300 ${
              isDarkMode ? 'bg-white/5' : 'bg-white/90'} focus:outline-none`}
          />
          <Link
            href="/pots/create"
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            Create Pot
          </Link>
        </div>
      </div>
    </section>
  );
}
