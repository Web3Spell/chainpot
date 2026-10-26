import { useQuery } from '@tanstack/react-query';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import type { Engine } from '@/lib/pot';

export interface Draft {
  id: string;
  name: string;
  emoji: string | null;
  engine: Engine;
  amountPerCycle: string;
  memberCount: number;
  cycleDuration: number;
  paymentWindow: number;
  biddingWindow: number;
  status: 'open' | 'locked' | 'deployed' | 'cancelled';
  seatsTaken: number;
  potId: string | null;
  isCreator?: boolean;
  members?: `0x${string}`[];
}

/** Drafts I organize or accepted (smart accounts only; empty otherwise). */
export function useMyDrafts() {
  const account = useChainPotAccount();
  return useQuery({
    queryKey: ['drafts', account.address],
    queryFn: () => apiFetch<Draft[]>(account, '/api/drafts'),
    enabled: account.isConnected && !!account.getIdentityToken,
    refetchInterval: 15_000,
  });
}

/** Public terms for an invite link. */
export function useDraftByToken(token: string) {
  return useQuery({
    queryKey: ['draft-link', token],
    queryFn: async () => {
      const res = await fetch(`/api/drafts/join/${encodeURIComponent(token)}`);
      const body = await res.json();
      if (!res.ok) throw Object.assign(new Error(body.error ?? 'This invite link isn’t valid'), { status: res.status });
      return body as Draft;
    },
    retry: false,
    refetchInterval: 15_000,
  });
}
