import { describe, expect, it } from "vitest";
import { CONTRACT_CONFIG } from "@/config/hooksConf";
import { describeCall } from "./describe";

const A = CONTRACT_CONFIG.addresses as Record<string, `0x${string}`>;
const call = (address: `0x${string}`, functionName: string, args: unknown[] = []) => ({ address, abi: [], functionName, args });

describe("describeCall allowlist", () => {
  it("blocks calls to contracts outside ChainPot", () => {
    expect(describeCall(call("0x000000000000000000000000000000000000dEaD", "transfer")).blocked).toBeTruthy();
  });

  it("only allows USDC approvals to the Vault", () => {
    expect(describeCall(call(A.usdc, "approve", [A.vault, BigInt(50_000_000)]))).toMatchObject({ amount: BigInt(50_000_000) });
    expect(describeCall(call(A.usdc, "approve", ["0x000000000000000000000000000000000000dEaD", BigInt(1)])).blocked).toBeTruthy();
    expect(describeCall(call(A.usdc, "transfer", [A.vault, BigInt(1)])).blocked).toBeTruthy();
  });

  it("describes ChainPot actions in plain language", () => {
    expect(describeCall(call(A.circleEngine, "joinPot", [BigInt(3), []])).text).toBe("Join Community Circle #3");
    expect(describeCall(call(A.auctionEngine, "placeBid", [BigInt(2), BigInt(450_000_000)])).text).toContain("$450");
    expect(describeCall(call(A.circleEngine, "payForCycle", [BigInt(1)]), { amount: BigInt(5) }).amount).toBe(BigInt(5));
    expect(describeCall(call(A.memberRegistry, "registerMember")).blocked).toBeUndefined();
  });
});
