import { useReadContracts } from 'wagmi';
import { engineContract, usePotCounter } from './useRoscaEngine';
import { useMyPots } from './useIndexer';
import type { Engine } from '@/lib/pot';

export interface PotRef {
  engine: Engine;
  potId: bigint;
}

const SCAN = 25; // without the indexer, check this many recent pots per engine

/** Pots the address belongs to, newest first. Indexer when available, else an on-chain scan. */
export function useMyPotIds(address?: `0x${string}`) {
  const indexed = useMyPots(address);
  const { data: circleCount } = usePotCounter('circle');
  const { data: auctionCount } = usePotCounter('auction');
  const useIndex = indexed.isSuccess;

  const candidates: PotRef[] = useIndex
    ? []
    : (['circle', 'auction'] as const).flatMap((engine) => {
        const n = Number((engine === 'circle' ? circleCount : auctionCount) ?? 0);
        return Array.from({ length: Math.min(SCAN, n) }, (_, i) => ({ engine, potId: BigInt(n - i) }));
      });

  const scan = useReadContracts({
    contracts: candidates.map((c) => ({ ...engineContract(c.engine), functionName: 'isMember' as const, args: [c.potId, address!] as const })),
    query: { enabled: !useIndex && !!address && candidates.length > 0 },
  });

  if (!address) return { pots: [] as PotRef[], isLoading: false };
  if (useIndex) {
    const pots = (indexed.data ?? [])
      .filter((r) => r.pot)
      .sort((a, b) => b.pot!.createdAt - a.pot!.createdAt)
      .map((r) => ({ engine: r.pot!.engine, potId: BigInt(r.pot!.potId) }));
    return { pots, isLoading: false };
  }
  const pots = candidates.filter((_, i) => scan.data?.[i]?.result === true);
  return { pots, isLoading: indexed.isLoading || scan.isLoading };
}
