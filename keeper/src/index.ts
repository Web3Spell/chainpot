// ChainPot keeper: sends the permissionless calls that keep pots moving so no member ever has to.
//
//   DRY_RUN=true  (default) — log what would be sent; needs no key.
//   DRY_RUN=false           — send with KEEPER_PRIVATE_KEY. That key should hold only gas ETH: every
//                             call it can make is permissionless and none can move user funds anywhere
//                             except to their owner (claimFor).
//
// Run once (cron): `npm run once`. Loop: `npm start` (every INTERVAL_SEC, default 60).

import { createWalletClient, http, parseGwei, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { IS_MAINNET, NETWORK } from "../../Frontend/config/network.ts";
import { CHAIN, auctionAbi, engineAbi, engineAddress, loadBalances, loadSnapshots, makePublicClient, vaultAbi, vaultAddress } from "./chain.ts";
import { planClaims, planPot, type KeeperAction } from "./plan.ts";
import { CRON_PATHS, cronDue, pingCron } from "./cron.ts";

const env = process.env;
const DRY_RUN = env.DRY_RUN !== "false";
const RPC_URL = env.KEEPER_RPC_URL ?? (IS_MAINNET ? undefined : env.BASE_SEPOLIA_RPC_URL) ?? NETWORK.defaultRpc;
const INTERVAL_SEC = Number(env.INTERVAL_SEC ?? 60);
const CLAIM_MIN = BigInt(env.CLAIM_MIN_USDC_UNITS ?? 1_000_000); // 1 USDC: don't spend gas pushing dust
const CLAIM_OPT_OUT = new Set((env.CLAIM_OPT_OUT ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean));
const MAX_FEE = env.MAX_FEE_GWEI ? parseGwei(env.MAX_FEE_GWEI) : parseGwei("1"); // refuse to send above this
// Optional: drive the app's reminder + autopay cron routes (Vercel Hobby only allows daily crons).
const APP_URL = env.APP_URL;
const CRON_SECRET = env.CRON_SECRET;
const CRON_EVERY_SEC = Number(env.CRON_EVERY_SEC ?? 900);
let lastCron: number | undefined;

// Reverts from contracts outside ChainPot's ABIs that operators need to recognise.
const KNOWN_SELECTORS: Record<string, string> = {
  "0x79bfd401": "Chainlink VRF: InvalidConsumer — add VRFProviderV4 as a consumer of the VRF subscription",
};

function reason(err: unknown) {
  const msg = (err as Error).message ?? String(err);
  const sel = /0x[0-9a-f]{8}\b/i.exec(msg)?.[0]?.toLowerCase();
  return (sel && KNOWN_SELECTORS[sel]) || msg.split("\n")[0];
}

const log = (event: string, data: Record<string, unknown> = {}) =>
  console.log(JSON.stringify({ t: new Date().toISOString(), event, ...data }, (_k, v) => (typeof v === "bigint" ? v.toString() : v)));

const publicClient = makePublicClient(RPC_URL);
const account = !DRY_RUN
  ? env.KEEPER_PRIVATE_KEY
    ? privateKeyToAccount(env.KEEPER_PRIVATE_KEY as Hex)
    : (() => {
        throw new Error("DRY_RUN=false requires KEEPER_PRIVATE_KEY");
      })()
  : undefined;
const wallet = account ? createWalletClient({ account, chain: CHAIN, transport: http(RPC_URL) }) : undefined;
// Dry runs still simulate from a real-looking sender so permissionless checks pass.
const simulateFrom: Address = account?.address ?? ((env.KEEPER_ADDRESS as Address) || "0x000000000000000000000000000000000000dEaD");

function request(a: KeeperAction) {
  switch (a.kind) {
    case "engine":
      return a.functionName === "declareWinner"
        ? { address: engineAddress(a.engine), abi: auctionAbi, functionName: "declareWinner" as const, args: [a.potId] as const }
        : a.functionName === "drawWinner"
          ? { address: engineAddress(a.engine), abi: engineAbi, functionName: "drawWinner" as const, args: [a.potId] as const }
          : { address: engineAddress(a.engine), abi: engineAbi, functionName: a.functionName, args: [a.potId] as const };
    case "releaseSlot":
      return { address: engineAddress(a.engine), abi: engineAbi, functionName: "releaseSlot" as const, args: [a.potId, a.member] as const };
    case "claimFor":
      return { address: vaultAddress, abi: vaultAbi, functionName: "claimFor" as const, args: [a.user] as const };
  }
}

async function execute(a: KeeperAction) {
  const req = request(a);
  // Simulate first: another keeper (or a member) may have already done it, and reverts cost gas.
  try {
    await publicClient.simulateContract({ ...req, account: simulateFrom } as Parameters<typeof publicClient.simulateContract>[0]);
  } catch (err) {
    log("skip", { action: a, reason: reason(err) });
    return;
  }
  if (DRY_RUN || !wallet) {
    log("would_send", { action: a });
    return;
  }
  const fees = await publicClient.estimateFeesPerGas();
  if (fees.maxFeePerGas && fees.maxFeePerGas > MAX_FEE) {
    log("skip", { action: a, reason: `gas price ${fees.maxFeePerGas} above cap ${MAX_FEE}` });
    return;
  }
  const hash = await wallet.writeContract(req as Parameters<typeof wallet.writeContract>[0]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  log(receipt.status === "success" ? "sent" : "reverted", { action: a, hash, gasUsed: receipt.gasUsed });
}

export async function tick() {
  const now = Math.floor(Date.now() / 1000);
  const snapshots = await loadSnapshots(publicClient, simulateFrom);
  const actions = snapshots.flatMap((s) => planPot(s, now));
  const claims = planClaims(await loadBalances(publicClient), CLAIM_MIN, CLAIM_OPT_OUT);
  log("tick", { pots: snapshots.length, actions: actions.length, claims: claims.length, dryRun: DRY_RUN });
  // Sequential: one nonce stream, and each lifecycle step changes state the next read depends on.
  for (const a of [...actions, ...claims]) {
    try {
      await execute(a);
    } catch (err) {
      log("error", { action: a, error: (err as Error).message.split("\n")[0] });
    }
  }
  await runCron();
}

/** Ping the app's cron routes when due. Off unless APP_URL and CRON_SECRET are set. */
async function runCron() {
  if (!APP_URL || !CRON_SECRET || !cronDue(lastCron, Date.now(), CRON_EVERY_SEC)) return;
  lastCron = Date.now();
  for (const path of CRON_PATHS) {
    try {
      const r = await pingCron(APP_URL, CRON_SECRET, path);
      log(r.ok ? "cron" : "cron_error", { path, status: r.status, ...(r.ok ? {} : { body: r.body }) });
    } catch (err) {
      log("cron_error", { path, error: (err as Error).message.split("\n")[0] });
    }
  }
}

async function main() {
  log("start", { network: NETWORK.id, dryRun: DRY_RUN, rpc: new URL(RPC_URL).host, sender: simulateFrom, intervalSec: INTERVAL_SEC, cron: APP_URL && CRON_SECRET ? `${new URL(APP_URL).host} every ${CRON_EVERY_SEC}s` : "off" });
  if (process.argv.includes("--once")) return tick();
  for (;;) {
    try {
      await tick();
    } catch (err) {
      log("tick_error", { error: (err as Error).message.split("\n")[0] });
    }
    await new Promise((r) => setTimeout(r, INTERVAL_SEC * 1000));
  }
}

main().catch((err) => {
  log("fatal", { error: String(err) });
  process.exit(1);
});
