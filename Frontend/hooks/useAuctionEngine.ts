import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

const auctionConfig = {
  address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.auctionEngine,
};

export function useLowestBid(potId: number | bigint, cycleIdx: number | bigint) {
  return useReadContract({
    ...auctionConfig,
    functionName: "lowestBid",
    args: [BigInt(potId || 0), BigInt(cycleIdx || 0)],
    query: { enabled: !!potId && !!cycleIdx },
  });
}

export function useLowestBidder(potId: number | bigint, cycleIdx: number | bigint) {
  return useReadContract({
    ...auctionConfig,
    functionName: "lowestBidder",
    args: [BigInt(potId || 0), BigInt(cycleIdx || 0)],
    query: { enabled: !!potId && !!cycleIdx },
  });
}

export function useBidOf(potId: number | bigint, cycleIdx: number | bigint, user: `0x${string}` | undefined) {
  return useReadContract({
    ...auctionConfig,
    functionName: "bidOf",
    args: user ? [BigInt(potId || 0), BigInt(cycleIdx || 0), user] : undefined,
    query: { enabled: !!potId && !!cycleIdx && !!user },
  });
}

export function useCreateAuctionPot() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const createPot = (
    merkleRoot: `0x${string}`,
    memberCount: number,
    amountPerCycle: bigint,
    cycleDuration: number,
    paymentWindow: number,
    biddingWindow: number
  ) => {
    writeContract({
      ...auctionConfig,
      functionName: "createPot",
      args: [merkleRoot, BigInt(memberCount), amountPerCycle, BigInt(cycleDuration), BigInt(paymentWindow), BigInt(biddingWindow)],
    });
  };

  return { createPot, hash, isPending, isConfirming, isConfirmed, error };
}

export function usePlaceBid() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const placeBid = (potId: bigint, amount: bigint) => {
    writeContract({
      ...auctionConfig,
      functionName: "placeBid",
      args: [potId, amount],
    });
  };

  return { placeBid, hash, isPending, isConfirming, isConfirmed, error };
}

export function useDeclareWinner() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const declareWinner = (potId: bigint) => {
    writeContract({
      ...auctionConfig,
      functionName: "declareWinner",
      args: [potId],
    });
  };

  return { declareWinner, hash, isPending, isConfirming, isConfirmed, error };
}
