"use client";

import { useState } from "react";
import { useWatchContractEvent } from "wagmi";
import type { Log } from "viem";
import { engineContract } from "./useRoscaEngine";
import { auctionContract } from "./useAuctionEngine";
import type { Engine } from "@/lib/pot";

export interface ActivityEvent {
  type: "Joined" | "PotCreated" | "Paid" | "WinnerSelected" | "BidPlaced";
  engine: Engine;
  timestamp: number;
  args: { potId?: bigint; cycleId?: bigint; amount?: bigint };
}

type LogWithArgs = Log & { args?: Record<string, unknown> };

/**
 * Live activity for the connected user since the page was opened. Full history needs the indexer
 * (Phase 1); until then this only shows events seen in this session, filtered to the user's address.
 */
export function useUserActivityEvents(address?: `0x${string}`) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const enabled = !!address;

  const push = (type: ActivityEvent["type"], engine: Engine) => (logs: LogWithArgs[]) =>
    setEvents((prev) => [
      ...logs.map((log) => ({ type, engine, timestamp: Date.now() / 1000, args: (log.args ?? {}) as ActivityEvent["args"] })),
      ...prev,
    ]);

  // Indexed-arg filters keep the subscription to this user's events only.
  for (const engine of ["circle", "auction"] as const) {
    const c = engineContract(engine);
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed two-iteration loop, stable hook order
    useWatchContractEvent({ ...c, eventName: "Joined", args: { member: address }, enabled, onLogs: push("Joined", engine) });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWatchContractEvent({ ...c, eventName: "PotCreated", args: { creator: address }, enabled, onLogs: push("PotCreated", engine) });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWatchContractEvent({ ...c, eventName: "Paid", args: { member: address }, enabled, onLogs: push("Paid", engine) });
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useWatchContractEvent({ ...c, eventName: "WinnerSelected", args: { winner: address }, enabled, onLogs: push("WinnerSelected", engine) });
  }
  useWatchContractEvent({ ...auctionContract, eventName: "BidPlaced", args: { bidder: address }, enabled, onLogs: push("BidPlaced", "auction") });

  return { events, isLoading: false };
}
