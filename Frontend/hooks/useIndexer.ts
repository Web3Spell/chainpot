import { useQuery } from "@tanstack/react-query";
import type { Engine } from "@/lib/pot";

// Read model served by the Ponder indexer (indexer/src/api). When NEXT_PUBLIC_INDEXER_URL is unset
// every hook here stays disabled and callers fall back to direct contract reads.
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL?.replace(/\/$/, "");

// BigInts arrive as decimal strings.
export interface IndexedPot {
  id: string;
  engine: Engine;
  potId: string;
  creator: `0x${string}`;
  merkleRoot: `0x${string}`;
  expectedMembers: number;
  amountPerCycle: string;
  cycleDuration: number;
  status: "open" | "active" | "completed";
  memberCount: number;
  currentCycle: number;
  completedCycles: number;
  createdAt: number;
}

export interface IndexedCycle {
  cycleId: number;
  startTime: number;
  status: "active" | "awaitingVRF" | "completed";
  totalCollected: string;
  paidCount: number;
  defaultsCount: number;
  vrfRequestedAt: number | null;
  randomnessReadyAt: number | null;
  fallbackWinner: boolean;
  winner: `0x${string}` | null;
  winnerAmount: string | null;
  completedAt: number | null;
}

export interface IndexedMember {
  address: `0x${string}`;
  active: boolean;
  paidCount: number;
  hasWon: boolean;
  wonCycle: number | null;
  defaulted: boolean;
}

export interface IndexedActivity {
  id: string;
  type: "created" | "joined" | "left" | "paid" | "bid" | "won" | "missed" | "credited" | "claimed";
  engine: Engine | null;
  potId: string | null;
  cycleId: number | null;
  amount: string | null;
  detail: number | null;
  timestamp: number;
  txHash: `0x${string}`;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${INDEXER_URL}${path}`);
  if (!res.ok) throw new Error(`indexer ${res.status}`);
  return res.json() as Promise<T>;
}

export function usePotIndex(engine: Engine, potId: bigint) {
  return useQuery({
    queryKey: ["indexer", "pot", engine, potId.toString()],
    queryFn: () =>
      get<{ pot: IndexedPot; cycles: IndexedCycle[]; members: IndexedMember[]; currentCycle: IndexedCycle | null }>(
        `/pots/${engine}/${potId}`,
      ),
    enabled: !!INDEXER_URL && potId > BigInt(0),
    retry: 1,
  });
}

export function useMyPots(address?: `0x${string}`) {
  return useQuery({
    queryKey: ["indexer", "userPots", address],
    queryFn: () => get<{ membership: IndexedMember; pot: IndexedPot | null }[]>(`/users/${address}/pots`),
    enabled: !!INDEXER_URL && !!address,
    retry: 1,
  });
}

export function useActivity(address?: `0x${string}`, limit = 50) {
  return useQuery({
    queryKey: ["indexer", "activity", address, limit],
    queryFn: () => get<IndexedActivity[]>(`/users/${address}/activity?limit=${limit}`),
    enabled: !!INDEXER_URL && !!address,
    retry: 1,
  });
}

export function useIndexerStats() {
  return useQuery({
    queryKey: ["indexer", "stats"],
    queryFn: () =>
      get<{ potsCreated: number; potsCompleted: number; totalContributed: string; totalPaidOut: string; safetyFundAccrued: string }>("/stats"),
    enabled: !!INDEXER_URL,
    retry: 1,
  });
}
