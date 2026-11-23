import { useQuery } from '@tanstack/react-query';
import type { Engine } from '@/lib/pot';
import { engineLabel } from '@/lib/pot';

export interface PotName {
  name: string;
  emoji: string;
  /** True when the creator named it (vs. the generated fallback). */
  custom: boolean;
}

export function fallbackName(engine: Engine, potId: bigint | string): PotName {
  return { name: `${engineLabel(engine)} #${String(potId)}`, emoji: engine === 'circle' ? '🎲' : '🏦', custom: false };
}

/** Display names for pots, falling back to "Community Circle #1" when unnamed or offline. */
export function usePotNames(refs: { engine: Engine; potId: bigint }[]) {
  const ids = refs.map((r) => `${r.engine}:${r.potId}`).sort().join(',');
  const { data } = useQuery({
    queryKey: ['potMeta', ids],
    queryFn: async () => (await (await fetch(`/api/pots/meta?ids=${ids}`)).json()) as Record<string, { name: string; emoji: string | null }>,
    enabled: ids.length > 0,
    staleTime: 60_000,
    refetchInterval: false,
  });
  return (engine: Engine, potId: bigint): PotName => {
    const m = data?.[`${engine}:${potId}`];
    const fb = fallbackName(engine, potId);
    return m ? { name: m.name, emoji: m.emoji ?? fb.emoji, custom: true } : fb;
  };
}
