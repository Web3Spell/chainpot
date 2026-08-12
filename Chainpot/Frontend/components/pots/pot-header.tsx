'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { 
  useGetPot, 
  useGetCycle, 
  useIsMember, 
  useJoinPot, 
  useStartPot, 
  useStartCycle, 
  useSettleCycle 
} from '@/hooks/useRoscaEngine';
import { useDeclareWinner } from '@/hooks/useAuctionEngine';
import { useDrawWinner } from '@/hooks/useCircleEngine';

interface PotHeaderProps {
  potId: string;
  engine: "circle" | "auction";
  isDarkMode: boolean;
}

export function PotHeader({ potId, engine, isDarkMode }: PotHeaderProps) {
  const { address } = useAccount();
  const potIdBig = BigInt(potId);

  const { data: potInfo, isLoading: isPotLoading, refetch: refetchPot } = useGetPot(engine, potIdBig);
  
  const creator = potInfo ? (potInfo as any)[0] : undefined;
  const status = potInfo ? Number((potInfo as any)[5] || 0) : 0;
  const currentCycleIdx = potInfo ? BigInt((potInfo as any)[6] || 0) : BigInt(0);
  const completedCycles = potInfo ? BigInt((potInfo as any)[7] || 0) : BigInt(0);
  const expectedMembers = potInfo ? BigInt((potInfo as any)[3] || 0) : BigInt(0);
  
  const { data: cycleInfo, isLoading: isCycleLoading, refetch: refetchCycle } = useGetCycle(engine, potIdBig, currentCycleIdx);
  const cycleStatus = cycleInfo ? (cycleInfo as any)[5] : 0;
  
  const { data: isMember, refetch: refetchMember } = useIsMember(engine, potIdBig, address);

  const isCreator = address && creator && address.toLowerCase() === String(creator).toLowerCase();

  const { joinPot, isPending: isJoinPending, isConfirming: isJoinConfirming, isConfirmed: isJoinConfirmed } = useJoinPot(engine);
  const { startPot, isPending: isStartPotPending, isConfirming: isStartPotConfirming, isConfirmed: isStartPotConfirmed } = useStartPot(engine);
  const { startCycle, isPending: isStartCyclePending, isConfirming: isStartCycleConfirming, isConfirmed: isStartCycleConfirmed } = useStartCycle(engine);
  const { settleCycle, isPending: isSettlePending, isConfirming: isSettleConfirming, isConfirmed: isSettleConfirmed } = useSettleCycle(engine);
  const { declareWinner, isPending: isDeclarePending, isConfirming: isDeclareConfirming, isConfirmed: isDeclareConfirmed } = useDeclareWinner();
  const { drawWinner, isPending: isDrawPending, isConfirming: isDrawConfirming, isConfirmed: isDrawConfirmed } = useDrawWinner();

  const isBusy = isJoinPending || isJoinConfirming || isStartPotPending || isStartPotConfirming || isStartCyclePending || isStartCycleConfirming || isSettlePending || isSettleConfirming || isDeclarePending || isDeclareConfirming || isDrawPending || isDrawConfirming;

  useEffect(() => {
    if (isJoinConfirmed || isStartPotConfirmed || isStartCycleConfirmed || isSettleConfirmed || isDeclareConfirmed || isDrawConfirmed) {
      setTimeout(() => {
        refetchPot();
        refetchCycle();
        refetchMember();
      }, 2000);
    }
  }, [isJoinConfirmed, isStartPotConfirmed, isStartCycleConfirmed, isSettleConfirmed, isDeclareConfirmed, isDrawConfirmed, refetchPot, refetchCycle, refetchMember]);

  const handleJoin = async () => {
    if (!address) return;
    try {
      const stored = localStorage.getItem(`merkle_${(potInfo as any)[1]}`);
      if (!stored) {
        alert("You do not have a Merkle proof to join this pot. Please ask the creator for the invite link.");
        return;
      }
      const proofs = JSON.parse(stored);
      const myProof = proofs.find((p: any) => p.address.toLowerCase() === address.toLowerCase());
      if (!myProof) {
        alert("Your address is not in the whitelist for this pot.");
        return;
      }
      joinPot(potIdBig, myProof.proof);
    } catch (e: any) {
      alert("Error joining: " + e.message);
    }
  };

  const getStatusText = () => {
    if (status === 0) return "Open (Waiting for members)";
    if (status === 1) return "Active";
    return "Completed";
  };

  if (isPotLoading) return <div className="h-36 rounded-lg animate-pulse bg-white/10 mb-8" />;

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
        <div>
          <Link href="/pots" className={`text-sm font-bold mb-4 inline-block transition-opacity ${isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>← Back to Pots</Link>
          <h1 className="text-5xl font-black mb-2">Pot #{potId}</h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {engine === 'circle' ? '🎲 Community Circle' : '🏦 Business ROSCA'} • Created by {creator ? `${String(creator).slice(0, 8)}...` : ''}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap">
          {!isMember && status === 0 && (
            <button onClick={handleJoin} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`}>
              {isJoinPending || isJoinConfirming ? 'Joining...' : 'Join Pot'}
            </button>
          )}

          {isCreator && status === 0 && (
            <button onClick={() => startPot(potIdBig)} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 ${isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-black text-black hover:bg-black/10'}`}>
              {isStartPotPending || isStartPotConfirming ? 'Starting...' : 'Start Pot (Freeze Roster)'}
            </button>
          )}

          {isCreator && status === 1 && (cycleStatus === 0 || cycleStatus === 3) && completedCycles < expectedMembers && (
            <button onClick={() => startCycle(potIdBig)} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 ${isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-black text-black hover:bg-black/10'}`}>
              {isStartCyclePending || isStartCycleConfirming ? 'Starting...' : 'Start Next Cycle'}
            </button>
          )}

          {isCreator && status === 1 && cycleStatus === 1 && (
            <button onClick={() => settleCycle(potIdBig)} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold transition-all duration-300 bg-red-500 text-white hover:bg-red-600`}>
              {isSettlePending || isSettleConfirming ? 'Settling...' : 'Settle Defaults (After Deadline)'}
            </button>
          )}

          {isCreator && status === 1 && engine === 'auction' && cycleStatus === 1 && (
            <button onClick={() => declareWinner(potIdBig)} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold transition-all duration-300 bg-blue-500 text-white hover:bg-blue-600`}>
              {isDeclarePending || isDeclareConfirming ? 'Declaring...' : 'Declare Winner (After Bidding)'}
            </button>
          )}

          {isCreator && status === 1 && engine === 'circle' && cycleStatus === 1 && (
            <button onClick={() => drawWinner(potIdBig)} disabled={isBusy} className={`px-6 py-3 rounded-full font-bold transition-all duration-300 bg-blue-500 text-white hover:bg-blue-600`}>
              {isDrawPending || isDrawConfirming ? 'Drawing...' : 'Draw Winner (Request VRF)'}
            </button>
          )}
        </div>
      </div>

      <div className={`p-4 rounded-xl border-2 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${status === 1 ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="font-bold">{getStatusText()}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">
              Cycle {Number(currentCycleIdx)} / {Number(expectedMembers)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}