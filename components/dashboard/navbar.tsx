'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTheme } from '@/providers/theme-provider';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface NavbarProps {
  isDarkMode: boolean;
}

export function Navbar({ isDarkMode }: NavbarProps) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const { toggleTheme } = useTheme();
  const {isConnected} = useAccount()
  const navItems = [
    { id: 'home', label: 'Home', href: '/' },
    { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
    { id: 'pots', label: 'Pots', href: '/pots' },
    { id: 'liquidity', label: 'Liquidity', href: '#' },
    { id: 'about', label: 'About', href: '#' },
  ];

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md transition-colors duration-300 ${isDarkMode ? 'bg-black/30 border-b border-white/10' : 'bg-white/30'}`}>
      <div className="px-6 md:px-12 py-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white' : 'bg-black'}`}>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}>⛓</span>
          </div>
          <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>ChainPot</span>
        </Link>

        {/* Navigation */}
        <nav className={`hidden md:flex items-center gap-1 px-6 py-2 rounded-full ${isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-white/80 border border-black/20'}`}>
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setActiveNav(item.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                activeNav === item.id
                  ? isDarkMode
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'bg-white text-black shadow-sm'
                  : isDarkMode
                  ? 'text-white/70 hover:text-white'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm ${
              isDarkMode
                ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                : 'bg-white/80 border border-black/20 text-black hover:bg-white'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          {/* User Profile Button */}
          <ConnectButton 
            // Optional: Customize the appearance of the address/chain display
            accountStatus="avatar" // Shows an avatar/dot next to the address
            chainStatus="icon"    // Shows the chain icon (e.g., Ethereum logo)
            showBalance={false}   // Hide the balance to keep it compact
          />
        </div>
      </div>
    </header>
  );
}

          {/* Wallet Connect Button (RainbowKit) 
              This component handles all connection logic, pop-ups, and connected/disconnected display.
          */}
        
     