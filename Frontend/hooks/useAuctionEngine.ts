import { useReadContract } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

export const auctionContract = {
  address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.auctionEngine,
};

export const circleContract = {
  address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.circleEngine,
};

const id = (v: number | bigint | undefined) => BigInt(v || 0);

/** Lowest bid, bidder and the user's own bid for an AUCTION pot's cycle. Pass enabled=false for circle pots. */
export function useAuctionBids(
  potId: number | bigint,
  cycleIdx: number | bigint,
  user: `0x${string}` | undefined,
  enabled = true,
) {
  const on = enabled && !!potId && !!cycleIdx;
  const lowestBid = useReadContract({
    ...auctionContract,
    functionName: "lowestBid",
    args: [id(potId), id(cycleIdx)],
    query: { enabled: on },
  });
  const lowestBidder = useReadContract({
    ...auctionContract,
    functionName: "lowestBidder",
    args: [id(potId), id(cycleIdx)],
    query: { enabled: on },
  });
  const myBid = useReadContract({
    ...auctionContract,
    functionName: "bidOf",
    args: user ? [id(potId), id(cycleIdx), user] : undefined,
    query: { enabled: on && !!user },
  });
  const hasBid = useReadContract({
    ...auctionContract,
    functionName: "hasBidThisCycle",
    args: user ? [id(potId), id(cycleIdx), user] : undefined,
    query: { enabled: on && !!user },
  });
  const bidder = lowestBidder.data as `0x${string}` | undefined;
  return {
    lowestBid: (lowestBid.data as bigint | undefined) ?? BigInt(0),
    lowestBidder: bidder,
    hasLowest: !!bidder && bidder !== "0x0000000000000000000000000000000000000000",
    myBid: (myBid.data as bigint | undefined) ?? BigInt(0),
    hasBid: !!hasBid.data,
  };
}
