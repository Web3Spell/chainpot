"use client";

import { useState } from "react";
import { useWatchContractEvent } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

export function useUserActivityEvents(address?: `0x${string}`) {
  const [events, setEvents] = useState<any[]>([]);

  const pushEvent = (type: string, log: any, engine: "circle" | "auction") => {
    const timestamp = Date.now() / 1000;
    setEvents((prev) => [
      {
        type,
        log,
        timestamp,
        engine,
        args: log?.args ?? log,
      },
      ...prev,
    ]);
  };

  const isUser = (addr: any) =>
    address && addr && addr.toLowerCase() === address.toLowerCase();

  // ----- Circle Engine Events -----

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    eventName: "Joined",
    onLogs(logs) {
      logs.forEach((log) => {
        const member = (log.args as any).member;
        if (isUser(member)) pushEvent("Joined", log, "circle");
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    eventName: "PotCreated",
    onLogs(logs) {
      logs.forEach((log) => {
        const creator = (log.args as any).creator;
        if (isUser(creator)) pushEvent("PotCreated", log, "circle");
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    eventName: "CycleStarted",
    onLogs(logs) {
      logs.forEach((log) => pushEvent("CycleStarted", log, "circle"));
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    eventName: "WinnerSelected",
    onLogs(logs) {
      logs.forEach((log) => {
        const winner = (log.args as any).winner;
        if (isUser(winner)) pushEvent("WinnerSelected", log, "circle");
      });
    },
  });

  // ----- Auction Engine Events -----

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    eventName: "Joined",
    onLogs(logs) {
      logs.forEach((log) => {
        const member = (log.args as any).member;
        if (isUser(member)) pushEvent("Joined", log, "auction");
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    eventName: "PotCreated",
    onLogs(logs) {
      logs.forEach((log) => {
        const creator = (log.args as any).creator;
        if (isUser(creator)) pushEvent("PotCreated", log, "auction");
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    eventName: "CycleStarted",
    onLogs(logs) {
      logs.forEach((log) => pushEvent("CycleStarted", log, "auction"));
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    eventName: "WinnerSelected",
    onLogs(logs) {
      logs.forEach((log) => {
        const winner = (log.args as any).winner;
        if (isUser(winner)) pushEvent("WinnerSelected", log, "auction");
      });
    },
  });

  useWatchContractEvent({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    eventName: "BidPlaced",
    onLogs(logs) {
      logs.forEach((log) => {
        const bidder = (log.args as any).bidder;
        if (isUser(bidder)) pushEvent("BidPlaced", log, "auction");
      });
    },
  });

  return { events, isLoading: false };
}
