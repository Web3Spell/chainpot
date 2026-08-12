'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { usePotCounter, useGetPot, useIsMember } from '@/hooks/useRoscaEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import { formatUnits } from 'viem';

interface PoolOverviewProps {
  isDarkMode: boolean;
}

function PoolItem({ potId, engine, isDarkMode }: { potId: bigint, engine: "circle" | "auction", isDarkMode: boolean }) {
  const { data: potData, isLoading } = useGetPot(engine, potId);
  const { data: usdcDecimals } = useUSDCDecimals();
  const decimals = usdcDecimals ?? 6;

  if (isLoading || !potData) return null;

  const name = `Pot #${String(potId)}`;
  const description = `By ${String((potData as any)[0]).slice(0, 8)}...`;
  const amountPerCycle = BigInt((potData as any)[4] || 0);
  const cycleCount = Number((potData as any)[3] || 0);
  const statusRaw = Number((potData as any)[5] || 0);
  const status = statusRaw <= 1 ? 'Pending' : statusRaw === 2 ? 'Active' : 'Completed';
  const totalAmount = formatUnits(amountPerCycle * BigInt(cycleCount), decimals);
  const yieldRate = engine === 'circle' ? 'None' : 'Discount Bids';

  return (
    <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-xs text-gray-500">{description}</p>
          <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-500 text-xs rounded font-bold">
            {engine === 'circle' ? 'Community Circle' : 'Business ROSCA'}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${status === 'Active' ? 'bg-green-200 text-black' : 'bg-yellow-200 text-black'}`}>
          {status}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Total Amount</span>
          <span className="font-semibold">${totalAmount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Participants</span>
          <span className="font-semibold">{cycleCount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Yield Mechanism</span>
          <span className="font-semibold text-green-500">{yieldRate}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Link href={`/pots/${potId}?engine=${engine}`} className="flex-1">
          <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
            View Details
          </button>
        </Link>
      </div>
    </div>
  );
}

// Check membership and conditionally render
function CheckMembershipAndRender({ potId, engine, address, isDarkMode }: { potId: bigint, engine: "circle" | "auction", address: `0x${string}`, isDarkMode: boolean }) {
  const { data: isMember, isLoading } = useIsMember(engine, potId, address);
  if (isLoading || !isMember) return null;
  return <PoolItem potId={potId} engine={engine} isDarkMode={isDarkMode} />;
}

export function PoolOverview({ isDarkMode }: PoolOverviewProps) {
  const { address } = useAccount();

  const { data: circleCountRaw } = usePotCounter("circle");
  const { data: auctionCountRaw } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  // We'll check the last 10 pots from each engine as a simple discovery mechanism
  const circleIds = Array.from({ length: Math.min(10, circleCount) }, (_, i) => BigInt(circleCount - i));
  const auctionIds = Array.from({ length: Math.min(10, auctionCount) }, (_, i) => BigInt(auctionCount - i));

  if (!address) {
    return (
      <section className="py-12 space-y-6">
        <h2 className="text-3xl font-bold">Pool Overview</h2>
        <div className="p-8 rounded-3xl border-3 border-black text-gray-500">Please connect your wallet to view your pools.</div>
      </section>
    );
  }

  return (
    <section className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Pool Overview</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your Recent Pools</p>
        <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Scanning recent pots to find your memberships...</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {circleIds.map((id) => <CheckMembershipAndRender key={`circle-${id}`} potId={id} engine="circle" address={address} isDarkMode={isDarkMode} />)}
        {auctionIds.map((id) => <CheckMembershipAndRender key={`auction-${id}`} potId={id} engine="auction" address={address} isDarkMode={isDarkMode} />)}
      </div>
      
      {(circleCount === 0 && auctionCount === 0) && (
        <div className={`border-3 border-black rounded-3xl p-8 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No pots exist on the network yet.</p>
          <div className="pt-4">
            <Link href="/pots">
              <button className={`px-6 py-3 rounded-full font-semibold ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                Browse Pools
              </button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
