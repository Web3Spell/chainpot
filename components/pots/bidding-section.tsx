'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';

// Your hooks
import {
  useGetCycleInfo,
  useGetUserBid,
  usePlaceBid,
} from '@/hooks/useAuctionEngine';
import { useUSDCApprove, useUSDCAllowance } from '@/hooks/useUsdc';

interface BiddingSectionProps {
  potId: string;
  isDarkMode: boolean;
  cycleId?: bigint; // optional, but we derive it if not passed
}

export function BiddingSection({ potId, isDarkMode }: BiddingSectionProps) {
  const { address } = useAccount();
  const [bidAmount, setBidAmount] = useState('');

  /** Convert potId → BigInt */
  const potIdBig = useMemo(() => {
    try {
      return BigInt(potId);
    } catch {
      return BigInt(0);
    }
  }, [potId]);

  /** ------- Load Cycle Info ------- */
  const { data: cycleInfo } = useGetCycleInfo(BigInt(0)); // We'll derive correct cycleId after pot header integration

  // In your app, CurrentCycle passes cycleId — but here we fall back safely
  const cycleId = useMemo(() => {
    if (!cycleInfo) return undefined;
    try {
      const id = cycleInfo[0]; // potId index 0, but cycleId must come externally
      return id ? BigInt(id) : undefined;
    } catch {
      return undefined;
    }
  }, [cycleInfo]);

  /** ------- Fetch Highest Bid & User Bid ------- */
  const highestBid = cycleInfo ? cycleInfo[4] : BigInt(0); // index 4 = winningBid
  const bidderCount = cycleInfo ? cycleInfo[6] : BigInt(0);

  const { data: myBid } = useGetUserBid(
    cycleId ?? BigInt(0),
    address as `0x${string}`
  );

  /** Format numbers from USDC (6 decimals) */
  const formatUSD = (value: any) => {
    try {
      const bi = BigInt(value);
      const whole = bi / BigInt(1000000);
      const frac = (bi % BigInt(1000000)).toString().padStart(6, '0').slice(0, 2);
      return `$${whole}.${frac}`;
    } catch {
      return '$0.00';
    }
  };

  /** ------- Approve + Bid Flow ------- */
  const {
    approve,
    hash: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useUSDCApprove();

  const {
    placeBid,
    hash: bidHash,
    isPending: isBidSigning,
    error: bidError,
  } = usePlaceBid();

  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(
    address as `0x${string}`,
  );

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  const {
    isLoading: isBidConfirming,
    isSuccess: isBidConfirmed,
  } = useWaitForTransactionReceipt({ hash: bidHash });

  /** ------- Step Logic ------- */
  const bidAmountBig = useMemo(() => {
    try {
      return BigInt(Math.floor(parseFloat(bidAmount) * 1_000_000));
    } catch {
      return BigInt(0);
    }
  }, [bidAmount]);

  const needsApproval = allowance ? allowance < bidAmountBig : true;

  const handleBid = async () => {
    if (!address) return alert('Connect wallet first');
    if (!cycleId) return alert('No active cycle');

    if (bidAmountBig <= BigInt(0)) return alert('Invalid bid amount');

    if (needsApproval) {
      approve(bidAmountBig);
      onSuccess: () => refetchAllowance();
      return;
    }

    placeBid(cycleId, bidAmountBig);
  };

  /** ------- UI Status Text ------- */
  const status = (() => {
    if (isApproving) return 'Waiting for wallet approval...';
    if (isApproveConfirming) return 'Approving USDC...';
    if (isBidSigning) return 'Waiting for wallet signature...';
    if (isBidConfirming) return 'Placing your bid...';
    if (isBidConfirmed) return '✅ Bid successfully placed!';
    return null;
  })();

  return (
    <section className="mb-8">
      <h2
        className={`text-3xl font-bold mb-6 ${
          isDarkMode ? 'text-white' : 'text-black'
        }`}
      >
        Place Your Bid
      </h2>

      <div
        className={`p-8 rounded-2xl border-3 border-black ${
          isDarkMode ? 'bg-white/5' : 'bg-white/90'
        }`}
      >
        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Input */}
          <div className="flex-1">
            <label
              className={`block text-sm font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-black'
              }`}
            >
              Bid Amount (USD)
            </label>

            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              placeholder="Enter your bid amount"
              className={`w-full px-4 py-3 rounded-lg border-2 border-black transition-colors ${
                isDarkMode ? 'bg-white/5' : 'bg-white/90'
              } focus:outline-none`}
            />

            <p
              className={`text-xs font-medium mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}
            >
              Highest bid: {formatUSD(highestBid)}  
              <br />
              Your bid: {myBid ? formatUSD(myBid) : '$0.00'}
            </p>
          </div>

          {/* Button */}
          <button
            onClick={handleBid}
            disabled={isApproving || isBidSigning || isApproveConfirming || isBidConfirming}
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
                : 'bg-black text-white hover:bg-black/90 disabled:opacity-50'
            }`}
          >
            {needsApproval
              ? 'Approve USDC'
              : isBidSigning || isBidConfirming
              ? 'Placing Bid...'
              : 'Place Bid'}
          </button>
        </div>

        {/* Status */}
        {status && (
          <p className="mt-4 text-sm text-white/80 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {status}
          </p>
        )}

        {/* Errors */}
        {(approveError || bidError) && (
          <p className="mt-3 text-red-400 text-sm">
            Error: {(approveError || bidError)?.message}
          </p>
        )}

        {/* Success */}
        {isBidConfirmed && (
          <p className="mt-3 text-green-400 text-sm">Bid placed successfully!</p>
        )}
      </div>
    </section>
  );
}
