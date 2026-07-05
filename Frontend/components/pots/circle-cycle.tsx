'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { useGetPot, useGetCycle, usePaidForCycle, usePayForCycle } from '@/hooks/useRoscaEngine';
import { useUSDCApprove, useUSDCAllowance, useUSDCDecimals } from '@/hooks/useUsdc';
import { CONTRACT_CONFIG } from '@/config/hooksConf';
import { CountdownTimer } from './countdown-timer';

interface CircleCycleProps {
  potId: string;
  isDarkMode: boolean;
}

export function CircleCycle({ potId, isDarkMode }: CircleCycleProps) {
  const { address } = useAccount();
  const potIdBig = BigInt(potId);

  const { data: potInfo, isLoading: potLoading } = useGetPot("circle", potIdBig);
  const amountPerCycle = potInfo ? BigInt((potInfo as any)[4] || 0) : BigInt(0);
  const currentCycleIdx = potInfo ? BigInt((potInfo as any)[6] || 0) : BigInt(0);

  const { data: cycleInfo, isLoading: cycleLoading } = useGetCycle("circle", potIdBig, currentCycleIdx);
  const cycleStatus = cycleInfo ? (cycleInfo as any)[5] : 0;
  const paymentDeadline = cycleInfo ? Number((cycleInfo as any)[1] || 0) : 0;
  const isCycleActive = cycleStatus === 1;

  const { data: hasPaidRaw, refetch: refetchPaid } = usePaidForCycle("circle", potIdBig, currentCycleIdx, address);
  const hasPaid = !!hasPaidRaw;

  const { data: usdcDecimals } = useUSDCDecimals();
  const decimals = usdcDecimals ?? 6;
  const vaultAddress = CONTRACT_CONFIG.addresses.vault as `0x${string}`;

  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(address, vaultAddress);
  const needsApproval = (allowance || BigInt(0)) < amountPerCycle;

  const { approve, isPending: isApprovePending, isConfirming: isApproveConfirming, isConfirmed: isApproveConfirmed, error: approveError } = useUSDCApprove(vaultAddress);
  const { payForCycle, isPending: isPayPending, isConfirming: isPayConfirming, isConfirmed: isPayConfirmed, error: payError } = usePayForCycle("circle");

  useEffect(() => {
    if (isApproveConfirmed) setTimeout(refetchAllowance, 1000);
  }, [isApproveConfirmed, refetchAllowance]);

  useEffect(() => {
    if (isPayConfirmed) setTimeout(refetchPaid, 1000);
  }, [isPayConfirmed, refetchPaid]);

  const handleApprove = async () => approve(amountPerCycle);
  const handlePay = async () => payForCycle(potIdBig);

  const formatUSD = (val: bigint) => `$${formatUnits(val, decimals)}`;

  const step = hasPaid ? 3 : (needsApproval ? 1 : 2);

  if (potLoading || cycleLoading) return <div className="h-32 bg-white/10 animate-pulse rounded-lg mb-8" />;
  if (!isCycleActive) return null;

  return (
    <section className="mb-8">
      <h2 className="text-3xl font-bold mb-6">Circle: Pay Cycle Due</h2>
      <div className={`p-8 rounded-2xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        
        {/* Step Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 1 ? 'bg-green-500 text-white' : step === 1 ? 'bg-black text-white' : 'bg-gray-300'}`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <span>Approve USDC</span>
          </div>
          <div className={`h-1 w-12 ${step > 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-black text-white' : 'bg-gray-300'}`}>
              {step > 2 ? '✓' : '2'}
            </div>
            <span>Pay Cycle</span>
          </div>
          <div className={`h-1 w-12 ${step > 2 ? 'bg-green-500' : 'bg-gray-300'}`} />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step === 3 ? 'bg-green-500 text-white' : 'bg-gray-300'}`}>
              {step === 3 ? '✓' : '3'}
            </div>
            <span>Awaiting VRF Draw</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <div className="flex-1 p-4 rounded-lg bg-black/5">
            <p><strong>Cycle Payment Required:</strong> {formatUSD(amountPerCycle)}</p>
            {!hasPaid && <CountdownTimer deadline={paymentDeadline} label="Payment Due In" isDarkMode={isDarkMode} />}
            {hasPaid && <p className="text-green-500 mt-2 font-bold">You have paid for this cycle. Please wait for the cycle to complete.</p>}
          </div>

          {!hasPaid && (
            <button
              onClick={step === 1 ? handleApprove : handlePay}
              disabled={isApprovePending || isApproveConfirming || isPayPending || isPayConfirming}
              className="px-8 py-3 rounded-full font-bold bg-black text-white hover:bg-black/80 disabled:opacity-50"
            >
              {step === 1 ? 'Approve' : 'Pay for Cycle'}
            </button>
          )}
        </div>

        {(approveError || payError) && (
          <p className="mt-4 text-red-500 text-sm">{(approveError || payError)?.message}</p>
        )}
      </div>
    </section>
  );
}
