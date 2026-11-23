// Autopay = an on-chain session key on the member's Kernel smart account. The limits below are
// enforced by the account itself (ZeroDev permission validator + call policy), so ChainPot's server
// holding the session key can do exactly one thing: pay this pot's installment from this member's
// balance, until the pot ends. It cannot transfer USDC, approve anyone but the Vault, approve more
// than one installment, touch another pot, or act after expiry.
//
// No rate limit on purpose: the engine already rejects a second payment in the same round
// (AlreadyPaid), and a rolling window that drifts from round start times could block a legitimate
// payment and make the member default.

import { erc20Abi, type Address } from "viem";
import { entryPoint07Address } from "viem/account-abstraction";
import { createKernelAccount } from "@zerodev/sdk";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { toPermissionValidator, type ModularSigner, type Policy } from "@zerodev/permissions";
import { CallPolicyVersion, ParamCondition, toCallPolicy, toTimestampPolicy } from "@zerodev/permissions/policies";
import { CONTRACT_CONFIG } from "@/config/hooksConf";
import type { Engine } from "@/lib/pot";

/** A read client (public client) on the target chain. */
export type ChainClient = Parameters<typeof createKernelAccount>[0];

/** Privy deploys Kernel v0.3.1 on EntryPoint 0.7 (permissionless `toKernelSmartAccount`). */
export const KERNEL = {
  entryPoint: { address: entryPoint07Address, version: "0.7" as const },
  kernelVersion: KERNEL_V3_1,
};

export interface AutopayScope {
  engine: Engine;
  potId: bigint;
  /** One installment, in USDC base units. */
  amountPerCycle: bigint;
  /** Unix seconds; the permission stops working after this. */
  validUntil: number;
  /** Override addresses for tests/forks. */
  addresses?: { usdc: Address; vault: Address; engine: Address };
}

const payForCycleAbi = [
  { type: "function", name: "payForCycle", stateMutability: "nonpayable", inputs: [{ name: "potId", type: "uint256" }], outputs: [] },
] as const;

export function scopeAddresses(scope: AutopayScope) {
  return (
    scope.addresses ?? {
      usdc: CONTRACT_CONFIG.addresses.usdc as Address,
      vault: CONTRACT_CONFIG.addresses.vault as Address,
      engine: (scope.engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as Address,
    }
  );
}

/** The complete set of on-chain rules for one autopay mandate. */
export function autopayPolicies(scope: AutopayScope): Policy[] {
  const a = scopeAddresses(scope);
  return [
    toCallPolicy({
      policyVersion: CallPolicyVersion.V0_0_4,
      permissions: [
        {
          target: a.usdc,
          abi: erc20Abi,
          functionName: "approve",
          valueLimit: BigInt(0),
          args: [
            { condition: ParamCondition.EQUAL, value: a.vault },
            { condition: ParamCondition.LESS_THAN_OR_EQUAL, value: scope.amountPerCycle },
          ],
        },
        {
          target: a.engine,
          abi: payForCycleAbi,
          functionName: "payForCycle",
          valueLimit: BigInt(0),
          args: [{ condition: ParamCondition.EQUAL, value: scope.potId }],
        },
      ],
    }),
    toTimestampPolicy({ validUntil: scope.validUntil }),
  ];
}

export function autopayValidator(client: ChainClient, sessionSigner: ModularSigner, scope: AutopayScope) {
  return toPermissionValidator(client, { ...KERNEL, signer: sessionSigner, policies: autopayPolicies(scope) });
}

/**
 * The member's Kernel account with the autopay validator attached as a regular plugin. `owner` is the
 * account's sudo signer (Privy's embedded wallet); enabling the plugin requires its signature.
 */
export async function ownerAccountWithAutopay(
  client: ChainClient,
  owner: Parameters<typeof signerToEcdsaValidator>[1]["signer"],
  sessionSigner: ModularSigner,
  scope: AutopayScope,
) {
  const sudo = await signerToEcdsaValidator(client, { ...KERNEL, signer: owner });
  const regular = await autopayValidator(client, sessionSigner, scope);
  return createKernelAccount(client, { ...KERNEL, plugins: { sudo, regular }, index: BigInt(0) });
}

/** Autopay expiry: one cycle after the last round could possibly start, plus a day of slack. */
export function mandateExpiry(now: number, cyclesLeft: number, cycleDuration: number) {
  return now + (cyclesLeft + 1) * cycleDuration + 86_400;
}
