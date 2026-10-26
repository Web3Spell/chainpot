'use client';

import { CreatePotForm } from '@/components/pots/create-pot-form';
import { Navbar } from '@/components/dashboard/navbar';
import { useTheme } from '@/providers/theme-provider';

export default function CreatePotPage() {
  const { isDarkMode } = useTheme();

  return (
    <div className={`min-h-screen bg-cp-page text-cp-ink transition-colors duration-300 ${isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreatePotForm isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}
