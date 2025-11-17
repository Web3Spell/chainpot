// hooks/useUserActivityEvents.ts
"use client";

import { useEffect, useState } from "react";
import {
  useOnPotJoined,
  useOnBidPlaced,
  useOnCycleStarted,
  useOnWinnerDeclared,
  useOnPotCreated,
} from "@/hooks/useAuctionEngine";

export function useUserActivityEvents(address?: `0x${string}`) {
  const [events, setEvents] = useState<any[]>([]);

  // Helper → push safe event record
  const pushEvent = (type: string, log: any) => {
    const timestamp = Date.now() / 1000;

    setEvents((prev) => [
      {
        type,
        log,
        timestamp,
        // extract args safely
        args: log?.args ?? log,
      },
      ...prev, // newest first
    ]);
  };

  // ------------ USER-SPECIFIC FILTERS -------------
  const isUser = (addr: any) =>
    address && addr && addr.toLowerCase() === address.toLowerCase();

  // ------------------------------------------------
  // 🔵 EVENT: JoinedPot(address user, uint256 potId)
  // ------------------------------------------------
  useOnPotJoined((logs: any[]) => {
    logs.forEach((log) => {
      const user = log?.args?.user ?? log?.args?.[0];
      if (isUser(user)) pushEvent("JoinedPot", log);
    });
  });

  // ------------------------------------------------
  // 🔵 EVENT: BidPlaced(cycleId, bidder, amount)
  // ------------------------------------------------
  useOnBidPlaced((logs: any[]) => {
    logs.forEach((log) => {
      const bidder = log?.args?.bidder ?? log?.args?.[1];
      if (isUser(bidder)) pushEvent("BidPlaced", log);
    });
  });

  // ------------------------------------------------
  // 🔵 EVENT: WinnerDeclared(potId, cycleId, winner)
  // ------------------------------------------------
  useOnWinnerDeclared((logs: any[]) => {
    logs.forEach((log) => {
      const winner = log?.args?.winner ?? log?.args?.[2];
      if (isUser(winner)) pushEvent("WinnerDeclared", log);
    });
  });

  // ------------------------------------------------
  // 🟡 EVENT: CycleStarted(potId, cycleId)
  // (not user-specific but useful for dashboard)
  // ------------------------------------------------
  useOnCycleStarted((logs: any[]) => {
    logs.forEach((log) => {
      pushEvent("CycleStarted", log);
    });
  });

  // ------------------------------------------------
  // 🟣 EVENT: PotCreated(creator, potId)
  // ------------------------------------------------
  useOnPotCreated((logs: any[]) => {
    logs.forEach((log) => {
      const creator = log?.args?.creator ?? log?.args?.[0];
      if (isUser(creator)) pushEvent("PotCreated", log);
    });
  });

  return {
    events,
    isLoading: false, // events load live
  };
}
