'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/dashboard/navbar';
import { PotHeader } from '@/components/pots/pot-header';
import { PotStats } from '@/components/pots/pot-stats';
import { LifecyclePanel } from '@/components/pots/lifecycle-panel';
import { CurrentCycle } from '@/components/pots/current-cycle';
import { YourRound } from '@/components/pots/your-round';
import { CycleHistory } from '@/components/pots/cycle-history';
import { useTheme } from '@/providers/theme-provider';
import { usePot } from '@/hooks/useRoscaEngine';
import { potHref, type Engine } from '@/lib/pot';

function useResolvedEngine(potId: bigint, urlEngine: string | null) {
  const explicit: Engine | undefined = urlEngine === 'circle' || urlEngine === 'auction' ? urlEngine : undefined;
  // Pot IDs overlap between the two engines, so without ?engine= look the ID up in both.
  const circle = usePot(explicit ? undefined : 'circle', potId);
  const auction = usePot(explicit ? undefined : 'auction', potId);
  if (explicit) return { engine: explicit, loading: false, ambiguous: false };
  const loading = circle.isLoading || auction.isLoading;
  if (circle.pot && auction.pot) return { engine: undefined, loading, ambiguous: true };
  return { engine: circle.pot ? 'circle' as const : auction.pot ? 'auction' as const : undefined, loading, ambiguous: false };
}

export default function PotDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();
  const rawId = String(params.id ?? '');
  const potId = /^\d+$/.test(rawId) ? BigInt(rawId) : BigInt(0);
  const { engine, loading, ambiguous } = useResolvedEngine(potId, searchParams.get('engine'));
  const { pot, isLoading: potLoading } = usePot(engine, potId);

  const shell = (children: React.ReactNode) => (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className={`px-6 md:px-12 py-8 max-w-7xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>{children}</div>
    </main>
  );

  if (loading || (engine && potLoading)) return shell(<div className="h-36 rounded-lg animate-pulse bg-white/10" />);

  if (ambiguous) {
    return shell(
      <div className="space-y-4">
        <h1 className="text-4xl font-black">Which pot #{rawId}?</h1>
        <p className="text-gray-500">There&apos;s a Community Circle and a Business ROSCA with this number.</p>
        <div className="flex gap-3">
          <Link href={potHref('circle', rawId)} className="px-6 py-3 rounded-full font-bold bg-black text-white">🎲 Community Circle #{rawId}</Link>
          <Link href={potHref('auction', rawId)} className="px-6 py-3 rounded-full font-bold bg-black text-white">🏦 Business ROSCA #{rawId}</Link>
        </div>
      </div>,
    );
  }

  if (!engine || !pot) {
    return shell(
      <div className="space-y-4">
        <h1 className="text-4xl font-black">Pot not found</h1>
        <p className="text-gray-500">This pot doesn&apos;t exist, or the link is incomplete.</p>
        <Link href="/pots" className="font-bold underline">Browse pots</Link>
      </div>,
    );
  }

  const props = { potId, engine, isDarkMode };
  return shell(
    <>
      <PotHeader {...props} />
      <LifecyclePanel {...props} />
      <YourRound {...props} />
      <PotStats {...props} />
      <CurrentCycle {...props} />
      <CycleHistory {...props} />
    </>,
  );
}
