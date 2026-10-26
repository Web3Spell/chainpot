'use client';

import { Plus } from 'lucide-react';
import { Navbar } from '@/components/dashboard/navbar';
import { MyCircles } from '@/components/home/my-circles';
import { BalanceCard } from '@/components/home/balance-card';
import { ReminderSettings } from '@/components/dashboard/reminder-settings';
import { MyActivities } from '@/components/dashboard/my-activities';
import { ButtonLink } from '@/components/ui/button';
import { useTheme } from '@/providers/theme-provider';

export default function HomePage() {
  const { isDarkMode } = useTheme();

  return (
    <main className={`min-h-screen bg-cp-page text-cp-ink transition-colors duration-300 ${isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className="px-4 sm:px-6 md:px-12 py-8 max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-black">Your circles</h1>
            <p className="text-cp-muted mt-1">What&apos;s due, what you&apos;ve received, and what&apos;s next.</p>
          </div>
          <ButtonLink href="/pots/create" size="lg">
            <Plus className="h-5 w-5" aria-hidden="true" /> Start a circle
          </ButtonLink>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
          <section aria-labelledby="circles-heading" className="space-y-4">
            <h2 id="circles-heading" className="sr-only">My circles</h2>
            <MyCircles />
          </section>
          <aside className="space-y-6">
            <BalanceCard />
          </aside>
        </div>

        <ReminderSettings isDarkMode={isDarkMode} />
        <MyActivities isDarkMode={isDarkMode} />
      </div>
    </main>
  );
}
