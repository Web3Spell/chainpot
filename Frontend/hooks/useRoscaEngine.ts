import { useReadContract } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";
import { parseCycle, parsePot, parsePotConfig, type Engine } from "@/lib/pot";

// Both engines share RoscaEngineBaseV4's functions with identical signatures, so the circle ABI
// type is used for shared calls on either engine.
export function engineContract(engine: Engine) {
  return {
    address: (engine === "circle"
      ? CONTRACT_CONFIG.addresses.circleEngine
      : CONTRACT_CONFIG.addresses.auctionEngine) as `0x${string}`,
    abi: (engine === "circle"
      ? CONTRACT_CONFIG.abis.circleEngine
      : CONTRACT_CONFIG.abis.auctionEngine) as typeof CONTRACT_CONFIG.abis.circleEngine,
  };
}

const id = (v: number | bigint | undefined) => BigInt(v || 0);

export function usePotCounter(engine: Engine) {
  return useReadContract({ ...engineContract(engine), functionName: "potCounter" });
}

export function usePot(engine: Engine | undefined, potId: number | bigint) {
  const q = useReadContract({
    ...engineContract(engine ?? "circle"),
    functionName: "getPot",
    args: [id(potId)],
    query: { enabled: !!engine && !!potId },
  });
  return { ...q, pot: parsePot(q.data) };
}

export function usePotConfig(engine: Engine, potId: number | bigint) {
  const q = useReadContract({
    ...engineContract(engine),
    functionName: "getPotConfig",
    args: [id(potId)],
    query: { enabled: !!potId },
  });
  return { ...q, config: parsePotConfig(q.data) };
}

export function useCycle(engine: Engine, potId: number | bigint, cycleIdx: number | bigint) {
  const q = useReadContract({
    ...engineContract(engine),
    functionName: "getCycle",
    args: [id(potId), id(cycleIdx)],
    query: { enabled: !!potId && !!cycleIdx },
  });
  return { ...q, cycle: parseCycle(q.data) };
}

export function useGetMembers(engine: Engine, potId: number | bigint) {
  return useReadContract({
    ...engineContract(engine),
    functionName: "getMembers",
    args: [id(potId)],
    query: { enabled: !!potId },
  });
}

export function useDrawReady(engine: Engine, potId: number | bigint, enabled = true) {
  return useReadContract({
    ...engineContract(engine),
    functionName: "drawReady",
    args: [id(potId)],
    // Poll while a draw is pending so "Finalize" appears soon after Chainlink delivers.
    query: { enabled: enabled && !!potId, refetchInterval: enabled ? 10_000 : false },
  });
}

/** Per-member flags for one pot (and its current cycle) in a single hook. */
export function useMemberState(engine: Engine, potId: number | bigint, cycleIdx: number | bigint, user?: `0x${string}`) {
  const c = engineContract(engine);
  const enabled = !!potId && !!user;
  const isMember = useReadContract({
    ...c,
    functionName: "isMember",
    args: user ? [id(potId), user] : undefined,
    query: { enabled },
  });
  const hasWon = useReadContract({
    ...c,
    functionName: "hasWonInPot",
    args: user ? [id(potId), user] : undefined,
    query: { enabled },
  });
  const defaulted = useReadContract({
    ...c,
    functionName: "defaulted",
    args: user ? [id(potId), user] : undefined,
    query: { enabled },
  });
  const paid = useReadContract({
    ...c,
    functionName: "paidForCycle",
    args: user ? [id(potId), id(cycleIdx), user] : undefined,
    query: { enabled: enabled && !!cycleIdx },
  });
  const released = useReadContract({
    ...c,
    functionName: "slotReleased",
    args: user ? [id(potId), user] : undefined,
    query: { enabled },
  });
  return {
    isMember: !!isMember.data,
    hasWon: !!hasWon.data,
    defaulted: !!defaulted.data,
    paid: !!paid.data,
    slotReleased: !!released.data,
    isLoading: isMember.isLoading,
  };
}
