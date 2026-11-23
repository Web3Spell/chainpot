import { encodeFunctionData, erc20Abi, http, type Address } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPaymasterClient } from "viem/account-abstraction";
import { createKernelAccountClient } from "@zerodev/sdk";
import { deserializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner } from "@zerodev/permissions/signers";
import { CONTRACT_CONFIG } from "@/config/hooksConf";
import { KERNEL } from "@/lib/aa/autopay";
import type { Engine } from "@/lib/pot";
import { serverPublicClient } from "./chain";

/**
 * Pays one installment with the member's autopay session key: one user operation containing
 * [approve(Vault, amount), payForCycle(potId)], sponsored by the paymaster. The account's on-chain
 * policy rejects anything else.
 */
export async function payWithSessionKey(m: { engine: Engine; potId: bigint; serialized: string; sessionKey: `0x${string}`; amount: bigint }) {
  const bundlerUrl = process.env.AUTOPAY_BUNDLER_URL;
  if (!bundlerUrl) throw new Error("AUTOPAY_BUNDLER_URL not configured");
  const paymasterUrl = process.env.AUTOPAY_PAYMASTER_URL;

  const account = await deserializePermissionAccount(
    serverPublicClient as never,
    KERNEL.entryPoint,
    KERNEL.kernelVersion,
    m.serialized,
    await toECDSASigner({ signer: privateKeyToAccount(m.sessionKey) }),
  );
  const kernel = createKernelAccountClient({
    account,
    chain: baseSepolia,
    client: serverPublicClient as never,
    bundlerTransport: http(bundlerUrl),
    ...(paymasterUrl ? { paymaster: createPaymasterClient({ transport: http(paymasterUrl) }) } : {}),
  });

  const engine = (m.engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as Address;
  const hash = await kernel.sendUserOperation({
    calls: [
      { to: CONTRACT_CONFIG.addresses.usdc as Address, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [CONTRACT_CONFIG.addresses.vault as Address, m.amount] }) },
      { to: engine, data: encodeFunctionData({ abi: CONTRACT_CONFIG.abis.circleEngine, functionName: "payForCycle", args: [m.potId] }) },
    ],
  });
  const receipt = await kernel.waitForUserOperationReceipt({ hash });
  if (!receipt.success) throw new Error(`payment reverted (user operation ${hash})`);
  return receipt.receipt.transactionHash;
}
