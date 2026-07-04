'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/providers/theme-provider';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { useWithdrawable, useClaim } from '@/hooks/useVault';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import { formatUnits } from 'viem';

interface NavbarProps {
  isDarkMode: boolean;
}

export function Navbar({ isDarkMode }: NavbarProps) {
  const { toggleTheme } = useTheme();
  const { isConnected, address } = useAccount();
  const pathname = usePathname();

  const { data: withdrawable } = useWithdrawable(address);
  const { claim, isPending, isConfirming, isConfirmed } = useClaim();
  const { data: decimals } = useUSDCDecimals();

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
          <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-transparent`}>
            <span className={`text-sm font-bold ${isDarkMode ? 'text-black' : 'text-white'}`}><Image src={`/images/logo-${isDarkMode ? 'white' : 'black'}.svg`} alt="ChainPot" width={30} height={30} /></span>
          </div>
          <span className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-black'}`}>ChainPot</span>
        </Link>

        {/* Navigation */}
        <nav className={`hidden md:flex items-center gap-1 px-6 py-2 rounded-full ${isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-white/80 border border-black/20'}`}>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive ? (isDarkMode ? 'bg-white/20 text-white shadow-sm' : 'bg-white text-black shadow-sm') : (isDarkMode ? 'text-white/70 hover:text-white' : 'text-black/70 hover:text-black')}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {withdrawable && BigInt(withdrawable) > BigInt(0) && (
            <button
              onClick={() => claim()}
              disabled={isPending || isConfirming}
              className={`px-4 py-2 rounded-full font-bold text-sm bg-green-500 text-white hover:bg-green-600 transition-all ${isPending || isConfirming ? 'opacity-50' : ''}`}
            >
              Claim ${formatUnits(BigInt(withdrawable || 0), decimals ?? 6)}
            </button>
          )}

          <button onClick={toggleTheme} className={`px-4 py-2 rounded-full transition-all duration-300 font-medium text-sm ${isDarkMode ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white/80 border border-black/20 text-black hover:bg-white'}`}>
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
          <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}