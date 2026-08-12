'use client';

import { Navbar } from '@/components/dashboard/navbar';
import { PotsHero } from '@/components/pots/pots-hero';
import { PotsGrid } from '@/components/pots/pots-grid';
import { useTheme } from '@/providers/theme-provider';

export default function PotsPage() {
  
  const { isDarkMode } = useTheme();

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className={`px-6 md:px-12 py-8 max-w-7xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <PotsHero isDarkMode={isDarkMode} />
        <PotsGrid isDarkMode={isDarkMode} />
      </div>
    </main>
  );
}
