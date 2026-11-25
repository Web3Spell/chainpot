'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useTheme } from '@/providers/theme-provider';
import { AccountButton } from '@/components/aa/account-button';
import { CountryButton } from '@/components/country-picker';
import { useWithdrawable, useClaim } from '@/hooks/useVault';
import { Money } from '@/components/money';

interface NavbarProps {
  isDarkMode: boolean;
}

const NAV = [
  { label: 'My circles', href: '/dashboard' },
  { label: 'Explore', href: '/pots' },
  { label: 'About', href: '/about' },
  { label: 'Start a circle', href: '/pots/create' },
];

function isActive(href: string, pathname: string) {
  if (href === '/pots') return pathname === '/pots' || /^\/pots\/\d/.test(pathname);
  return pathname === href;
}

export function Navbar({ isDarkMode }: NavbarProps) {
  const { toggleTheme } = useTheme();
  const { address } = useChainPotAccount();
  const pathname = usePathname() ?? '';
  const { data: withdrawable } = useWithdrawable(address);
  const ready = (withdrawable as bigint | undefined) ?? BigInt(0);
  const claim = useClaim();

  const link = (href: string) =>
    `px-4 min-h-11 inline-flex shrink-0 items-center whitespace-nowrap rounded-full text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent ${
      isActive(href, pathname) ? 'bg-cp-ink text-cp-ink-inverse' : 'text-cp-ink hover:bg-cp-line-soft'
    }`;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-cp-page/70 border-b border-cp-line-soft text-cp-ink">
      <div className="px-4 sm:px-6 md:px-12 py-3 flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent">
          <Image src={`/images/logo-${isDarkMode ? 'white' : 'black'}.svg`} alt="" width={30} height={30} style={{ width: 30, height: 30 }} />
          <span className="font-bold text-lg">ChainPot</span>
        </Link>

        <nav aria-label="Main" className="hidden md:flex items-center gap-1 p-1 rounded-full border border-cp-line-soft bg-cp-surface">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={link(item.href)} aria-current={isActive(item.href, pathname) ? 'page' : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 min-w-0">
          {ready > BigInt(0) && (
            <button
              type="button"
              onClick={claim.claim}
              disabled={claim.isBusy}
              className="hidden sm:inline-flex min-h-11 items-center px-4 rounded-full text-sm font-bold bg-cp-success text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
            >
              {claim.isBusy ? 'Collecting…' : <>Collect <Money usdc={ready} /></>}
            </button>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            className="h-11 w-11 inline-flex items-center justify-center rounded-full border border-cp-line-soft hover:bg-cp-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
          >
            {isDarkMode ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
          <CountryButton isDarkMode={isDarkMode} />
          <AccountButton isDarkMode={isDarkMode} compact />
        </div>
      </div>

      {/* Phones: the same three destinations, always reachable. */}
      <nav aria-label="Main" className="md:hidden flex gap-1 px-4 pb-2 overflow-x-auto [scrollbar-width:none]">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={link(item.href)} aria-current={isActive(item.href, pathname) ? 'page' : undefined}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
