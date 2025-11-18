'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

// Your hooks
import {
  useGetPotInfo,
  useGetCycleInfo,
  useGetUserBid,
  useHasMemberPaidForCycle,
  usePayForCycle,
  usePlaceBid,
} from '@/hooks/useAuctionEngine';
import { useUSDCApprove, useUSDCAllowance } from '@/hooks/useUsdc';
import { CONTRACT_CONFIG } from '@/config/hooksConf';

interface BiddingSectionProps {
  potId: string;
  isDarkMode: boolean;
}

/* Helper to safely get field from tuple/object */
function getField(p: any, index: number, name?: string) {
  if (!p) return undefined;
  if (Array.isArray(p) && p.length > index) return p[index];
  if (name && typeof p === 'object') {
    if (name in p) return p[name];
    return p[index];
  }
  return undefined;
}

function bigIntToNumberSafe(v: any, fallback = 0) {
  try {
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'number') return v;
    if (v && typeof v.toNumber === 'function') return v.toNumber();
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  } catch {}
  return fallback;
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

  /** ------- 1. Fetch Pot Info to get cycleId and amountPerCycle ------- */
  const { data: potInfo, isLoading: potLoading } = useGetPotInfo(potIdBig);

  /** ------- Get amountPerCycle from pot info (index 2) ------- */
  const amountPerCycle = useMemo(() => {
    if (!potInfo) return BigInt(0);
    const raw = getField(potInfo, 2, 'amountPerCycle');
    if (typeof raw === 'bigint') return raw;
    if (typeof raw === 'number') return BigInt(Math.floor(raw));
    try {
      return BigInt(String(raw));
    } catch {
      return BigInt(0);
    }
  }, [potInfo]);

  /** ------- 2. Derive cycleId from pot info ------- */
  const cycleId = useMemo(() => {
    if (!potInfo) return undefined;
    const cycleIds = getField(potInfo, 10, 'cycleIds');
    if (Array.isArray(cycleIds) && cycleIds.length > 0) {
      const last = cycleIds[cycleIds.length - 1];
      try {
        return typeof last === 'bigint' ? last : BigInt(last);
      } catch { 
        return undefined; 
      }
    }
    return undefined;
  }, [potInfo]);

  /** ------- 3. Fetch Cycle Info ------- */
  const { data: cycleInfo, isLoading: cycleLoading } = useGetCycleInfo(cycleId ?? BigInt(0));

  /** ------- 4. Check if cycle is active ------- */
  const isCycleActive = useMemo(() => {
    if (!cycleInfo || !cycleId || cycleId === BigInt(0)) return false;
    const startTime = getField(cycleInfo, 1, 'startTime');
    const endTime = getField(cycleInfo, 2, 'endTime');
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = startTime ? bigIntToNumberSafe(startTime, 0) : 0;
    const endSec = endTime ? bigIntToNumberSafe(endTime, 0) : 0;
    
    return startSec > 0 && nowSec >= startSec && (endSec === 0 || nowSec < endSec);
  }, [cycleInfo, cycleId]);

  /** ------- 5. Fetch Highest Bid & User Bid ------- */
  const highestBid = useMemo(() => {
    if (!cycleInfo) return BigInt(0);
    return getField(cycleInfo, 4, 'winningBid') ?? BigInt(0);
  }, [cycleInfo]);

  const { data: myBid, refetch: refetchUserBid } = useGetUserBid(
    cycleId ?? BigInt(0),
    address as `0x${string}`
  );

  /** ------- 6. Check if user has paid for the cycle ------- */
  const { 
    data: hasPaid, 
    isLoading: isCheckingPayment, 
    refetch: refetchPaymentStatus 
  } = useHasMemberPaidForCycle(
    potIdBig,
    address as `0x${string}`
  );

  const userHasPaid = useMemo(() => {
    if (hasPaid === undefined || hasPaid === null) return false;
    return Boolean(hasPaid);
  }, [hasPaid]);

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

  /** ------- Approve + Pay + Bid Flow ------- */
  const USDC_TOKEN_ADDRESS = '0x036cbd53842c5426634e7929541ec2318f3dcf7e' as `0x${string}`;
  const auctionEngineAddress = CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`;

  const {
    approve,
    hash: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useUSDCApprove(auctionEngineAddress, USDC_TOKEN_ADDRESS);

  const {
    payForCycle,
    hash: payHash,
    isPending: isPaying,
    error: payError,
  } = usePayForCycle();

  const {
    placeBid,
    hash: bidHash,
    isPending: isBidSigning,
    error: bidError,
  } = usePlaceBid();

  const { data: allowance, refetch: refetchAllowance } = useUSDCAllowance(
    address as `0x${string}`,
    auctionEngineAddress,
    USDC_TOKEN_ADDRESS
  );

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({ hash: approveHash });

  const {
    isLoading: isPayConfirming,
    isSuccess: isPayConfirmed,
  } = useWaitForTransactionReceipt({ hash: payHash });

  const {
    isLoading: isBidConfirming,
    isSuccess: isBidConfirmed,
  } = useWaitForTransactionReceipt({ hash: bidHash });

  /** ------- Effect: Refetch allowance after approval is confirmed ------- */
  useEffect(() => {
    if (isApproveConfirmed) {
      console.log('Approval confirmed, refetching allowance...');
      setTimeout(() => {
        refetchAllowance();
      }, 1000);
    }
  }, [isApproveConfirmed, refetchAllowance]);

  /** ------- Effect: Refetch payment status after payment is confirmed ------- */
  useEffect(() => {
    if (isPayConfirmed) {
      console.log('Payment confirmed, refetching payment status...');
      setTimeout(() => {
        refetchPaymentStatus();
      }, 2000);
    }
  }, [isPayConfirmed, refetchPaymentStatus]);

  /** ------- Effect: Refetch user bid after bid is placed ------- */
  useEffect(() => {
    if (isBidConfirmed) {
      console.log('Bid confirmed, refetching user bid...');
      setTimeout(() => {
        refetchUserBid();
        setBidAmount(''); // Clear bid input after successful bid
      }, 2000);
    }
  }, [isBidConfirmed, refetchUserBid]);

  /** ------- Convert bid amount to USDC with 6 decimals ------- */
  const bidAmountBig = useMemo(() => {
    try {
      if (!bidAmount || parseFloat(bidAmount) <= 0) return BigInt(0);
      return parseUnits(bidAmount as `${number}`, 6);
    } catch {
      return BigInt(0);
    }
  }, [bidAmount]);

  /** ------- Check if approval is sufficient ------- */
  const needsApproval = useMemo(() => {
    if (!allowance || amountPerCycle <= BigInt(0)) return true;
    // Check if current allowance is less than required amount
    return allowance < amountPerCycle;
  }, [allowance, amountPerCycle]);

  /** ------- Handler for Approve button ------- */
  const handleApprove = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (amountPerCycle <= BigInt(0)) {
      alert('Invalid cycle amount. Please try again.');
      return;
    }

    try {
      console.log('Approving USDC amount:', amountPerCycle.toString());
      await approve(amountPerCycle);
    } catch (err: any) {
      console.error('Approve error:', err);
      alert(err?.message || 'Failed to approve USDC');
    }
  };

  /** ------- Handler for Pay for Cycle button ------- */
  const handlePayForCycle = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!cycleId || cycleId === BigInt(0)) {
      alert('No active cycle found. Please wait for a cycle to start.');
      return;
    }

    if (!isCycleActive) {
      alert('Cycle is not active. Payment is not available at this time.');
      return;
    }

    try {
      console.log('Paying for cycle:', cycleId.toString());
      await payForCycle(cycleId);
    } catch (err: any) {
      console.error('Pay for cycle error:', err);
      alert(err?.message || 'Failed to pay for cycle');
    }
  };

  /** ------- Handler for Place Bid button ------- */
  const handlePlaceBid = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!cycleId || cycleId === BigInt(0)) {
      alert('No active cycle found. Please wait for a cycle to start.');
      return;
    }

    if (!isCycleActive) {
      alert('Cycle is not active. Bidding is not available at this time.');
      return;
    }

    if (bidAmountBig <= BigInt(0)) {
      alert('Please enter a valid bid amount');
      return;
    }

    // Check if bid is higher than current highest bid
    if (bidAmountBig <= highestBid) {
      alert(`Your bid must be higher than the current highest bid of ${formatUSD(highestBid)}`);
      return;
    }

    try {
      console.log('Placing bid:', bidAmountBig.toString());
      await placeBid(cycleId, bidAmountBig);
    } catch (err: any) {
      console.error('Place bid error:', err);
      alert(err?.message || 'Failed to place bid');
    }
  };

  /** ------- Determine current step and button configuration ------- */
  const getButtonConfig = () => {
    // Step 3: User has paid, can place bid
    if (userHasPaid) {
      return {
        step: 3,
        text: isBidSigning || isBidConfirming ? 'Placing Bid...' : 'Place Bid',
        onClick: handlePlaceBid,
        disabled: isBidSigning || isBidConfirming || bidAmountBig <= BigInt(0) || bidAmountBig <= highestBid,
        status: isBidSigning ? 'Waiting for wallet signature...' : 
                isBidConfirming ? 'Placing your bid...' : null,
      };
    }

    // Step 2: Approved, need to pay for cycle
    if (!needsApproval || isApproveConfirmed) {
      return {
        step: 2,
        text: isPaying || isPayConfirming ? 'Paying for Cycle...' : 'Pay for Cycle',
        onClick: handlePayForCycle,
        disabled: isPaying || isPayConfirming || !isCycleActive,
        status: isPaying ? 'Waiting for wallet signature...' : 
                isPayConfirming ? 'Processing payment...' : null,
      };
    }

    // Step 1: Need approval
    return {
      step: 1,
      text: isApproving || isApproveConfirming ? 'Approving USDC...' : 'Approve USDC',
      onClick: handleApprove,
      disabled: isApproving || isApproveConfirming || amountPerCycle <= BigInt(0),
      status: isApproving ? 'Waiting for wallet approval...' : 
              isApproveConfirming ? 'Approving USDC...' : null,
    };
  };

  const buttonConfig = getButtonConfig();

  /** ------- Render loading state ------- */
  const loading = potLoading || cycleLoading;

  if (loading) {
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
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Loading cycle information...
          </p>
        </div>
      </section>
    );
  }

  if (!cycleId || cycleId === BigInt(0)) {
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
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            No active cycle. Please wait for a cycle to start.
          </p>
        </div>
      </section>
    );
  }

  if (!isCycleActive) {
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
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Cycle is not active. Bidding is not available at this time.
          </p>
        </div>
      </section>
    );
  }

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
        {/* Progress Steps Indicator */}
        <div className="mb-6 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${buttonConfig.step >= 1 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              buttonConfig.step === 1 ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') :
              buttonConfig.step > 1 ? 'bg-green-500 text-white' :
              (isDarkMode ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
            }`}>
              {buttonConfig.step > 1 ? '✓' : '1'}
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
              Approve
            </span>
          </div>
          
          <div className={`h-0.5 w-12 ${buttonConfig.step > 1 ? 'bg-green-500' : (isDarkMode ? 'bg-white/20' : 'bg-black/20')}`} />
          
          <div className={`flex items-center gap-2 ${buttonConfig.step >= 2 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              buttonConfig.step === 2 ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') :
              buttonConfig.step > 2 ? 'bg-green-500 text-white' :
              (isDarkMode ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
            }`}>
              {buttonConfig.step > 2 ? '✓' : '2'}
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
              Pay Cycle
            </span>
          </div>
          
          <div className={`h-0.5 w-12 ${buttonConfig.step > 2 ? 'bg-green-500' : (isDarkMode ? 'bg-white/20' : 'bg-black/20')}`} />
          
          <div className={`flex items-center gap-2 ${buttonConfig.step >= 3 ? 'opacity-100' : 'opacity-50'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              buttonConfig.step === 3 ? (isDarkMode ? 'bg-white text-black' : 'bg-black text-white') :
              (isDarkMode ? 'bg-white/20 text-white' : 'bg-black/20 text-black')
            }`}>
              3
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
              Place Bid
            </span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-end">
          {/* Input - Only show when user has paid */}
          {userHasPaid && (
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
                placeholder={`Minimum: ${formatUSD(highestBid + BigInt(1000000))}`}
                className={`w-full px-4 py-3 rounded-lg border-2 border-black transition-colors ${
                  isDarkMode ? 'bg-white/5 text-white' : 'bg-white/90 text-black'
                } focus:outline-none`}
              />

              <p
                className={`text-xs font-medium mt-2 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                Highest bid: {formatUSD(highestBid)}  
                <br />
                Your current bid: {myBid ? formatUSD(myBid) : '$0.00'}
              </p>
            </div>
          )}

          {/* Info box for steps 1 & 2 */}
          {!userHasPaid && (
            <div className="flex-1">
              <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-black/5'}`}>
                <p className={`text-sm ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
                  <strong>Cycle Payment:</strong> {formatUSD(amountPerCycle)}
                </p>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {buttonConfig.step === 1 
                    ? 'Approve USDC to continue' 
                    : 'Pay for the cycle to start bidding'}
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={buttonConfig.onClick}
            disabled={buttonConfig.disabled}
            className={`px-8 py-3 rounded-full font-bold transition-all duration-300 ${
              buttonConfig.disabled
                ? 'opacity-50 cursor-not-allowed'
                : isDarkMode
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-black text-white hover:bg-black/90'
            }`}
          >
            {buttonConfig.text}
          </button>
        </div>

        {/* Status */}
        {buttonConfig.status && (
          <p className={`mt-4 text-sm flex items-center gap-2 ${isDarkMode ? 'text-white/80' : 'text-black/80'}`}>
            <span className={`w-3 h-3 border-2 ${isDarkMode ? 'border-white' : 'border-black'} border-t-transparent rounded-full animate-spin`} />
            {buttonConfig.status}
          </p>
        )}

        {/* Errors */}
        {(approveError || payError || bidError) && (
          <p className="mt-3 text-red-400 text-sm">
            ❌ Error: {(approveError || payError || bidError)?.message}
          </p>
        )}

        {/* Success Messages */}
        {isApproveConfirmed && !userHasPaid && buttonConfig.step === 2 && (
          <p className="mt-3 text-green-400 text-sm">✅ USDC approved! Now pay for the cycle.</p>
        )}
        {isPayConfirmed && !userHasPaid && (
          <p className="mt-3 text-green-400 text-sm">✅ Payment successful! You can now place bids.</p>
        )}
        {isBidConfirmed && (
          <p className="mt-3 text-green-400 text-sm">✅ Bid placed successfully!</p>
        )}
      </div>
    </section>
  );
}