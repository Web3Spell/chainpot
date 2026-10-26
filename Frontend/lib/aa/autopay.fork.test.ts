// Proves the autopay limits on real contracts: forks Base Sepolia with anvil, deploys a Kernel v3.1
// account (the same kind Privy creates) with the autopay session key, then sends user operations
// straight to the EntryPoint (we play the bundler) and checks which ones the account accepts.
//
// Run: FORK_TESTS=1 npx vitest run lib/aa/autopay.fork.test.ts   (needs Foundry's `anvil` on PATH)

import { spawn, type ChildProcess } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createPublicClient, createTestClient, createWalletClient, encodeFunctionData, erc20Abi, http, parseEther, parseEventLogs,
  type Address, type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { entryPoint07Abi, entryPoint07Address, toPackedUserOperation, type SmartAccount } from "viem/account-abstraction";
import { toKernelSmartAccount } from "permissionless/accounts";
import { createKernelAccount } from "@zerodev/sdk";
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { deserializePermissionAccount, serializePermissionAccount } from "@zerodev/permissions";
import { toECDSASigner, toEmptyECDSASigner } from "@zerodev/permissions/signers";
import { KERNEL, ownerAccountWithAutopay, type AutopayScope } from "./autopay";
import { verifyPermissionBlob } from "@/lib/server/autopay";
import { CONTRACT_CONFIG } from "@/config/hooksConf";

const RUN = !!process.env.FORK_TESTS;
const PORT = 8547;
const RPC = `http://127.0.0.1:${PORT}`;
const FORK_URL = process.env.FORK_RPC_URL ?? "https://base-sepolia.gateway.tenderly.co";
const BUNDLER = privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"); // anvil #0
const ATTACKER = "0x000000000000000000000000000000000000bEEF" as Address;
const USDC = CONTRACT_CONFIG.addresses.usdc as Address;
const VAULT = CONTRACT_CONFIG.addresses.vault as Address;
const CIRCLE = CONTRACT_CONFIG.addresses.circleEngine as Address;
const AMOUNT = BigInt(50_000_000);

let anvil: ChildProcess;
const makeClient = () => createPublicClient({ chain: baseSepolia, transport: http(RPC) });
let client: ReturnType<typeof makeClient>;
let session: SmartAccount; // what ChainPot's server holds
let scope: AutopayScope;

const wallet = createWalletClient({ account: BUNDLER, chain: baseSepolia, transport: http(RPC) });
const testClient = createTestClient({ mode: "anvil", chain: baseSepolia, transport: http(RPC) });

/** Build, sign and submit one user operation; returns "accepted" (validation passed) or the revert. */
async function send(account: SmartAccount, calls: { to: Address; data: Hex }[]) {
  const [factoryArgs, nonce, fees] = await Promise.all([account.getFactoryArgs(), account.getNonce(), client.estimateFeesPerGas()]);
  const deployed = !!(await client.getCode({ address: account.address }))?.length;
  const userOp = {
    sender: account.address,
    nonce,
    ...(deployed ? {} : factoryArgs),
    callData: await account.encodeCalls(calls.map((c) => ({ ...c, value: BigInt(0) }))),
    callGasLimit: BigInt(1_500_000),
    verificationGasLimit: BigInt(3_000_000),
    preVerificationGas: BigInt(200_000),
    maxFeePerGas: fees.maxFeePerGas * BigInt(2),
    maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
  };
  const signature = await account.signUserOperation({ ...userOp, chainId: baseSepolia.id } as never);
  const packed = toPackedUserOperation({ ...userOp, signature } as Parameters<typeof toPackedUserOperation>[0]);
  const handleOps = { address: entryPoint07Address, abi: entryPoint07Abi, functionName: "handleOps", args: [[packed], BUNDLER.address], account: BUNDLER } as const;
  try {
    // A bundler simulates first; validation failures surface as EntryPoint FailedOp(…, "AA2x …").
    await client.simulateContract(handleOps);
  } catch (err) {
    const msg = (err as Error).message;
    return `rejected: ${msg.match(/AA\d\d[^"\\\n]*/)?.[0] ?? msg.split("\n")[0]}`;
  }
  const hash = await wallet.writeContract({ ...handleOps, gas: BigInt(8_000_000) });
  const receipt = await client.waitForTransactionReceipt({ hash });
  const [ev] = parseEventLogs({ abi: entryPoint07Abi, eventName: "UserOperationEvent", logs: receipt.logs });
  return ev ? (ev.args.success ? "accepted:executed" : "accepted:reverted") : `rejected: handleOps reverted`;
}

const approve = (spender: Address, amount: bigint) => ({ to: USDC, data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [spender, amount] }) });
const transfer = (to: Address, amount: bigint) => ({ to: USDC, data: encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, amount] }) });
const pay = (potId: bigint) => ({ to: CIRCLE, data: encodeFunctionData({ abi: CONTRACT_CONFIG.abis.circleEngine, functionName: "payForCycle", args: [potId] }) });

describe.skipIf(!RUN)("autopay session key on a Base Sepolia fork", () => {
  beforeAll(async () => {
    anvil = spawn("anvil", ["--fork-url", FORK_URL, "--port", String(PORT), "--silent"], { stdio: "ignore" });
    client = makeClient();
    for (let i = 0; i < 60; i++) {
      try {
        await client.getBlockNumber();
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    const owner = privateKeyToAccount(generatePrivateKey()); // stands in for Privy's embedded signer
    const sessionKey = generatePrivateKey(); // generated and kept by ChainPot's server
    const now = Number((await client.getBlock()).timestamp);
    scope = { engine: "circle", potId: BigInt(1), amountPerCycle: AMOUNT, validUntil: now + 7 * 86_400 };

    // 0. The member's wallet already exists and has been used by its owner (as a Privy wallet would be).
    const sudoOnly = await createKernelAccount(client, { ...KERNEL, plugins: { sudo: await signerToEcdsaValidator(client, { ...KERNEL, signer: owner }) }, index: BigInt(0) });
    await testClient.setBalance({ address: sudoOnly.address, value: parseEther("1") });
    expect(await send(sudoOnly, [approve(VAULT, BigInt(0))])).toBe("accepted:executed");

    // 1. Grant (browser): owner attaches the permission; only the session key's ADDRESS is used.
    const sessionAddressOnly = toEmptyECDSASigner(privateKeyToAccount(sessionKey).address);
    const ownerAccount = await ownerAccountWithAutopay(client, owner, sessionAddressOnly, scope);
    const serialized = await serializePermissionAccount(ownerAccount); // enable signature by owner; no private key inside
    // The server's check passes on a real blob, and catches a wider scope.
    expect(() => verifyPermissionBlob(serialized, scope, ownerAccount.address)).not.toThrow();
    expect(() => verifyPermissionBlob(serialized, { ...scope, amountPerCycle: AMOUNT + BigInt(1) }, ownerAccount.address)).toThrow();

    // 2. Executor (server): rebuild the account from the blob + its own session key.
    session = await deserializePermissionAccount(client, KERNEL.entryPoint, KERNEL.kernelVersion, serialized, await toECDSASigner({ signer: privateKeyToAccount(sessionKey) }));
    expect(session.address).toBe(ownerAccount.address);

    // Same address Privy's smart wallet would have for this owner — otherwise the key is useless.
    const privyStyle = await toKernelSmartAccount({ client: client as never, version: "0.3.1", entryPoint: KERNEL.entryPoint, useMetaFactory: "optional", owners: [owner] });
    expect(privyStyle.address).toBe(sudoOnly.address);
    expect(session.address).toBe(sudoOnly.address);
  }, 180_000);

  afterAll(() => {
    anvil?.kill();
  });

  it("allows approving exactly one installment to the Vault (enables the permission on first use)", async () => {
    expect(await send(session, [approve(VAULT, AMOUNT)])).toBe("accepted:executed");
    const allowance = await client.readContract({ address: USDC, abi: erc20Abi, functionName: "allowance", args: [session.address, VAULT] });
    expect(allowance).toBe(AMOUNT);
  }, 120_000);

  it("allows approve + payForCycle for THIS pot as one batch", async () => {
    // Passes validation; the engine itself then rejects it (this test account isn't a member).
    expect(await send(session, [approve(VAULT, AMOUNT), pay(BigInt(1))])).toMatch(/^accepted/);
  }, 120_000);

  it("rejects anything else", async () => {
    expect(await send(session, [transfer(ATTACKER, BigInt(1))])).toMatch(/^rejected/);
    expect(await send(session, [approve(ATTACKER, AMOUNT)])).toMatch(/^rejected/);
    expect(await send(session, [approve(VAULT, AMOUNT + BigInt(1))])).toMatch(/^rejected/);
    expect(await send(session, [pay(BigInt(2))])).toMatch(/^rejected/);
    expect(await send(session, [approve(VAULT, AMOUNT), transfer(ATTACKER, BigInt(1))])).toMatch(/^rejected/);
  }, 180_000);

  it("stops working after the pot's expiry", async () => {
    await testClient.setNextBlockTimestamp({ timestamp: BigInt(scope.validUntil + 60) });
    await testClient.mine({ blocks: 1 });
    expect(await send(session, [approve(VAULT, AMOUNT)])).toMatch(/^rejected/);
  }, 120_000);
});
