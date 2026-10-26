'use client';

import { ExternalLink } from 'lucide-react';
import { CONTRACT_CONFIG } from '@/config/hooksConf';
import { usePot } from '@/hooks/useRoscaEngine';
import type { Engine } from '@/lib/pot';

const SCAN = 'https://sepolia.basescan.org/address/';

/** For the curious: the contracts holding this circle's money and rules. */
export function VerifyOnChain({ engine, potId }: { engine: Engine; potId: bigint; isDarkMode?: boolean }) {
  const { pot } = usePot(engine, potId);
  const engineAddr = engine === 'circle' ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine;
  const rows: [string, string][] = [
    [engine === 'circle' ? 'Circle rules (CircleEngine)' : 'Auction rules (AuctionEngine)', engineAddr],
    ['Money is held by (Vault)', CONTRACT_CONFIG.addresses.vault],
    ['Fair draw (Chainlink VRF provider)', CONTRACT_CONFIG.addresses.lottery],
    ['Dollar token (USDC)', CONTRACT_CONFIG.addresses.usdc],
  ];
  return (
    <div className="mt-6">
      <h3 className="font-bold mb-2">Verify on-chain</h3>
      <p className="text-sm text-cp-muted mb-3">
        Everything about this circle is public on Base. ChainPot can&apos;t move members&apos; money; the contracts below enforce the rules.
        {pot && <> Invite list fingerprint: <code className="font-mono text-xs break-all">{pot.merkleRoot}</code></>}
      </p>
      <ul className="space-y-2 text-sm">
        {rows.map(([label, addr]) => (
          <li key={addr} className="flex flex-wrap items-center justify-between gap-2">
            <span>{label}</span>
            <a href={`${SCAN}${addr}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 min-h-11 font-mono text-xs underline underline-offset-4 text-cp-accent">
              {addr.slice(0, 10)}…{addr.slice(-6)} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              <span className="sr-only">(opens Basescan)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
