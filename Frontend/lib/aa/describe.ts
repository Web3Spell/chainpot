import { CONTRACT_CONFIG } from "@/config/hooksConf";
import type { ContractCall } from "./account";

// Plain-language descriptions for the confirmation sheet, plus the address allowlist: the app will
// only ever ask the user to sign calls to ChainPot's own contracts and USDC (approve to the Vault).

const A = CONTRACT_CONFIG.addresses;
const lower = (a: string) => a.toLowerCase();

const ENGINE_NAME: Record<string, string> = {
  [lower(A.circleEngine)]: "Community Circle",
  [lower(A.auctionEngine)]: "Business ROSCA",
};

const ALLOWED = new Set([A.circleEngine, A.auctionEngine, A.vault, A.memberRegistry, A.usdc].map(lower));

export interface CallDescription {
  text: string;
  /** USDC (6 decimals) that leaves the user's balance or is authorised to, if any. */
  amount?: bigint;
  /** Shown in red; the executor refuses to send when present. */
  blocked?: string;
}

const asBig = (v: unknown) => (typeof v === "bigint" ? v : BigInt(String(v ?? 0)));

export function describeCall(call: ContractCall, meta?: { amount?: bigint }): CallDescription {
  const to = lower(call.address);
  if (!ALLOWED.has(to)) return { text: `Unknown contract ${call.address}`, blocked: "This isn't a ChainPot contract, so it won't be sent." };

  const args = call.args ?? [];
  const pot = ENGINE_NAME[to] ? `${ENGINE_NAME[to]} #${String(args[0])}` : "";

  if (to === lower(A.usdc)) {
    if (call.functionName !== "approve") return { text: "USDC call", blocked: "Only approvals to the ChainPot Vault are allowed." };
    if (lower(String(args[0])) !== lower(A.vault)) return { text: "Approve USDC", blocked: "Approval to an address that isn't the ChainPot Vault." };
    return { text: "Allow ChainPot to take exactly this amount of USDC for this payment", amount: asBig(args[1]) };
  }

  switch (call.functionName) {
    case "registerMember":
      return { text: "Create your ChainPot account (one-time)" };
    case "joinPot":
      return { text: `Join ${pot}` };
    case "leavePot":
      return { text: `Leave ${pot} (lowers your reputation slightly)` };
    case "createPot":
      return { text: `Create a ${ENGINE_NAME[to]} with ${String(args[1])} members`, amount: undefined };
    case "startPot":
      return { text: `Start ${pot} — the member list is locked from now on` };
    case "startCycle":
      return { text: `Start the next round of ${pot}` };
    case "payForCycle":
      return { text: `Pay this round of ${pot}`, amount: meta?.amount };
    case "placeBid":
      return { text: `Bid to receive ${fmt(asBig(args[1]))} in ${ENGINE_NAME[to]} #${String(args[0])}` };
    case "drawWinner":
      return { text: `Run the fair draw for ${pot}` };
    case "declareWinner":
      return { text: `Declare this round's receiver for ${pot}` };
    case "finalizeDraw":
      return { text: `Finalize the draw for ${pot}` };
    case "cancelStuckVRFCycle":
      return { text: `Retry the draw for ${pot}` };
    case "releaseSlot":
      return { text: `Free your slot in ${pot}` };
    case "claim":
      return { text: "Move your ChainPot balance to your account" };
    default:
      return { text: `${call.functionName} on ChainPot` };
  }
}

export function fmt(v: bigint) {
  return `$${(Number(v) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
