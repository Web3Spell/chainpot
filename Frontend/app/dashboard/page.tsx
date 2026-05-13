'use client';

import { useState } from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { HeroSection } from '@/components/dashboard/hero-section';
import { StatsCards } from '@/components/dashboard/stats-card';
import { YieldCard } from '@/components/dashboard/yield-card';
import { PoolOverview } from '@/components/dashboard/pool-overview';
import { BrowsePools } from '@/components/dashboard/browse-pools';
import { MyActivities } from '@/components/dashboard/my-activities';
import { useTheme } from '@/providers/theme-provider';

export default function DashboardPage() {
  const {isDarkMode} = useTheme()

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode}/>
      <div className={`px-6 md:px-12 py-8 max-w-7xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <HeroSection isDarkMode={isDarkMode} />
        <StatsCards isDarkMode={isDarkMode} />
        <YieldCard isDarkMode={isDarkMode} />
        <PoolOverview isDarkMode={isDarkMode} />
        <BrowsePools isDarkMode={isDarkMode} />
        <MyActivities isDarkMode={isDarkMode} />
      </div>
    </main>
  );
}
