'use client';

import React from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { useGetPot, useGetCycle } from '@/hooks/useRoscaEngine';
import { useLowestBid, useBidOf } from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface CurrentCycleProps {
  potId: string;
  engine: "circle" | "auction";
  isDarkMode: boolean;
}

export function CurrentCycle({ potId, engine, isDarkMode }: CurrentCycleProps) {
  const { address } = useAccount();
  const potIdBig = BigInt(potId);

  const { data: potInfo, isLoading: potLoading } = useGetPot(engine, potIdBig);
  const currentCycleIdx = potInfo ? BigInt((potInfo as any)[6] || 0) : BigInt(0);
  const cycleCount = potInfo ? Number((potInfo as any)[3] || 0) : 0;
  const amountPerCycle = potInfo ? BigInt((potInfo as any)[4] || 0) : BigInt(0);

  const { data: cycleInfo, isLoading: cycleLoading } = useGetCycle(engine, potIdBig, currentCycleIdx);
  const { data: lowestBidRaw } = useLowestBid(potIdBig, currentCycleIdx);
  const { data: myBidRaw } = useBidOf(potIdBig, currentCycleIdx, address);
  
  const startTimeRaw = cycleInfo ? BigInt((cycleInfo as any)[0] || 0) : BigInt(0);
  const endTimeRaw = cycleInfo ? BigInt((cycleInfo as any)[1] || 0) : BigInt(0);
  const winnerAddr = cycleInfo ? (cycleInfo as any)[6] : "0x0000000000000000000000000000000000000000";
  const winningBidRaw = lowestBidRaw ? BigInt(lowestBidRaw) : BigInt(0);
  const status = cycleInfo ? Number((cycleInfo as any)[5] || 0) : 0;
  
  const { data: usdcDecimals } = useUSDCDecimals();
  const decimals = usdcDecimals ?? 6;

  if (potLoading || cycleLoading) {
    return (
      <section className="mb-8">
        <div className={`h-40 rounded-2xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`} />
      </section>
    );
  }

  if (!cycleInfo) {
    return (
      <section className="mb-8">
        <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No active cycle found for this pot.</p>
        </div>
      </section>
    );
  }

  const formatUSD = (val: bigint) => `$${formatUnits(val, decimals)}`;
  const fmtDate = (sec: bigint) => {
    if (sec === BigInt(0)) return '—';
    return new Date(Number(sec) * 1000).toLocaleDateString();
  };

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = Number(startTimeRaw);
  const endSec = Number(endTimeRaw);
  let daysRemaining = endSec > 0 ? Math.max(0, Math.ceil((endSec - nowSec) / 86400)) : 0;
  let percentElapsed = 0;
  if (startSec > 0 && endSec > 0) {
    percentElapsed = Math.min(100, Math.max(0, Math.floor(((nowSec - startSec) / (endSec - startSec)) * 100)));
  }

  const hasWinner = winnerAddr && winnerAddr !== "0x0000000000000000000000000000000000000000";

  return (
    <section className="mb-8">
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Cycle {Number(currentCycleIdx)} of {cycleCount}
      </h2>

      <div className={`p-8 rounded-2xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Cycle Details</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cycle Payment</span>
                <span className="font-bold">{formatUSD(amountPerCycle as bigint)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Start Date</span>
                <span className="font-bold">{fmtDate(startTimeRaw as bigint)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Payment Deadline</span>
                <span className="font-bold">{fmtDate(endTimeRaw as bigint)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Status</span>
                <span className="font-bold">
                  {status === 0 ? 'Pending' : status === 1 ? 'Active' : status === 2 ? 'In Default Grace Period' : 'Completed'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-4">Winner Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Winner</span>
                <span className="font-bold text-green-500">
                  {hasWinner ? `${String(winnerAddr).slice(0, 10)}...` : 'TBD'}
                </span>
              </div>
              {engine === 'auction' && (
                <>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Lowest Bid</span>
                    <span className="font-bold text-orange-500">{lowestBidRaw ? formatUSD(lowestBidRaw as bigint) : 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Your Bid</span>
                    <span className="font-bold">{myBidRaw ? formatUSD(myBidRaw as bigint) : 'None'}</span>
                  </div>
                </>
              )}
              {hasWinner && (
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Winning Bid (Discount)</span>
                  <span className="font-bold text-purple-500">{formatUSD(winningBidRaw as bigint)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <p className="text-sm font-medium mb-2 text-gray-500">Payment Period Progress</p>
          <div className="h-3 rounded-full overflow-hidden bg-black/10">
            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${percentElapsed}%` }} />
          </div>
          <p className="text-xs font-medium mt-2 text-gray-500">
            {daysRemaining} days remaining
          </p>
        </div>
      </div>
    </section>
  );
}
