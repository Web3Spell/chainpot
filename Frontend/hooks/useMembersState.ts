import { useReadContracts } from 'wagmi';
import { engineContract, useGetMembers } from './useRoscaEngine';
import type { Engine } from '@/lib/pot';

export interface MemberRow {
  address: `0x${string}`;
  paid: boolean;
  hasWon: boolean;
  defaulted: boolean;
}

/** Every member's flags for the current round, in one multicall. */
export function useMembersState(engine: Engine, potId: bigint, cycleIdx: number) {
  const { data: membersRaw, isLoading } = useGetMembers(engine, potId);
  const members = (membersRaw as `0x${string}`[] | undefined) ?? [];
  const c = engineContract(engine);
  const idx = BigInt(cycleIdx);
  const flags = useReadContracts({
    contracts: members.flatMap((m) => [
      { ...c, functionName: 'paidForCycle' as const, args: [potId, idx, m] as const },
      { ...c, functionName: 'hasWonInPot' as const, args: [potId, m] as const },
      { ...c, functionName: 'defaulted' as const, args: [potId, m] as const },
    ]),
    query: { enabled: members.length > 0 },
  });
  const rows: MemberRow[] = members.map((address, i) => ({
    address,
    paid: cycleIdx > 0 && flags.data?.[i * 3]?.result === true,
    hasWon: flags.data?.[i * 3 + 1]?.result === true,
    defaulted: flags.data?.[i * 3 + 2]?.result === true,
  }));
  return { rows, isLoading: isLoading || flags.isLoading };
}
