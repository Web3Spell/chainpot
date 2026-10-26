import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, decodeErrorResult, toFunctionSelector, type Abi } from "viem";
import { CONTRACT_CONFIG } from "@/config/hooksConf";

const ALL_ABIS: Abi[] = [
  CONTRACT_CONFIG.abis.circleEngine,
  CONTRACT_CONFIG.abis.auctionEngine,
  CONTRACT_CONFIG.abis.vault,
  CONTRACT_CONFIG.abis.memberRegistry,
] as unknown as Abi[];

// Errors raised by contracts ChainPot calls into (Chainlink VRF coordinator), which aren't in our ABIs.
const EXTERNAL_ERRORS: Record<string, string> = Object.fromEntries(
  ["InvalidConsumer(uint256,address)", "InsufficientBalance()", "InvalidSubscription()"].map((sig) => [
    toFunctionSelector(sig),
    sig.slice(0, sig.indexOf("(")),
  ]),
);

/**
 * Smart-account sends fail inside the bundler/paymaster, where viem can't attach our ABI. Pull any
 * revert selector out of the message and decode it against ChainPot's ABIs.
 */
function decodeEmbeddedRevert(text: string): string | undefined {
  for (const m of text.matchAll(/0x[0-9a-fA-F]{8,}/g)) {
    const external = EXTERNAL_ERRORS[m[0].slice(0, 10).toLowerCase()];
    if (external) return external;
    for (const abi of ALL_ABIS) {
      try {
        return decodeErrorResult({ abi, data: m[0] as `0x${string}` }).errorName;
      } catch {
        // not this ABI / not an error payload
      }
    }
  }
  return undefined;
}

// Plain-language messages for the V4 custom errors (and the common USDC reverts).
const MESSAGES: Record<string, string> = {
  AlreadyMember: "You're already a member of this pot.",
  AlreadyPaid: "You've already paid for this round.",
  AlreadyRegistered: "This account is already registered.",
  AlreadyReleased: "Your slot for this pot has already been released.",
  AlreadyWonThisPot: "You've already received a payout from this pot, so you can't bid or win again.",
  BidNotLower: "Your new bid must be lower than your previous bid.",
  BidTooHigh: "That bid is too high. It must be below the pot total and at least 2% below the current lowest bid.",
  BiddingClosed: "Bidding for this round has closed.",
  BiddingNotConfigured: "This pot doesn't use bidding.",
  BiddingNotOpen: "Bidding opens once the payment deadline has passed.",
  BiddingOpen: "Bidding is still open. The winner can be declared after bidding closes.",
  CannotStartCycle: "The next round can't start yet.",
  CooldownActive: "You recently joined or left this pot. Please wait 24 hours before trying again.",
  CycleCapReached: "All rounds for this pot have already run.",
  CycleNotActive: "This round isn't active anymore. Refresh to see the latest state.",
  CycleTooEarly: "It's too early to start the next round. Rounds follow the pot's schedule.",
  EnforcedPause: "ChainPot is temporarily paused for maintenance. Your deadlines are extended while paused.",
  InvalidParams: "Some pot settings are invalid. Check the amounts and time windows.",
  InvalidProof: "Your address isn't on this pot's invite list (or the invite link is outdated).",
  NotAwaitingVRF: "There's no draw waiting to be finalized.",
  NotCreator: "Only the pot creator can do this.",
  NotMember: "You're not an active member of this pot.",
  NotPaidThisCycle: "Pay for this round before bidding.",
  NotRegisteredOrAllowed: "Your account isn't allowed to do this. Register first, or check your reputation/blacklist status.",
  NothingToClaim: "There's nothing to claim yet.",
  PaymentWindowClosed: "The payment deadline for this round has passed.",
  PaymentWindowOpen: "Payments are still open. Try again after the payment deadline.",
  PotNotActive: "This pot isn't active.",
  PotNotCompleted: "This pot hasn't finished yet.",
  PotNotOpen: "This pot is no longer accepting members.",
  PreviousCycleOpen: "The current round must finish before the next one starts.",
  RandomnessNotReady: "The random draw hasn't arrived from Chainlink yet. Try again in a minute.",
  RosterFull: "This pot is already full.",
  RosterIncomplete: "Not everyone has joined yet. The pot can start once the roster is full.",
  TimeoutNotReached: "The draw is still within its waiting period. Retry becomes available 24 hours after the request.",
  InvalidConsumer: "The fair-draw service isn't connected yet (Chainlink VRF consumer not added). The ChainPot team needs to finish setup — your money is safe.",
  InsufficientBalance: "The fair-draw service is out of credit (Chainlink VRF subscription). The ChainPot team needs to top it up — your money is safe.",
  InvalidSubscription: "The fair-draw service isn't set up correctly (Chainlink VRF subscription). Your money is safe.",
  TooManyJoinedPots: "You've reached the limit of pots you can be in at once.",
  UserNotRegistered: "Register your account first.",
  SafeERC20FailedOperation: "The USDC transfer failed. Check your balance and approval.",
};

const REASON_HINTS: [RegExp, string][] = [
  [/exceeds balance/i, "You don't have enough USDC for this payment."],
  [/exceeds allowance|insufficient allowance/i, "Approve USDC first, then pay."],
];

/** Turn any wagmi/viem write error into a short, human sentence. */
export function friendlyError(error: unknown): string | undefined {
  if (!error) return undefined;
  const raw = error instanceof Error ? `${error.message} ${(error as { details?: string }).details ?? ""}` : String(error);
  if (/user (rejected|denied|cancel)|cancelled by user|mfa.*(cancel|abort)/i.test(raw)) return "You cancelled the request.";
  const embedded = decodeEmbeddedRevert(raw);
  if (embedded && MESSAGES[embedded]) return MESSAGES[embedded];
  if (error instanceof BaseError) {
    if (error.walk((e) => e instanceof UserRejectedRequestError)) return "You cancelled the request in your wallet.";
    const reverted = error.walk((e) => e instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && MESSAGES[name]) return MESSAGES[name];
      const ext = reverted.signature ? EXTERNAL_ERRORS[reverted.signature.toLowerCase()] : undefined;
      if (ext) return MESSAGES[ext];
      const reason = reverted.reason ?? "";
      for (const [re, msg] of REASON_HINTS) if (re.test(reason)) return msg;
      if (name) return `Transaction rejected by the contract (${name}).`;
      if (reason) return reason;
    }
    const text = error.shortMessage || error.message;
    for (const [re, msg] of REASON_HINTS) if (re.test(error.message)) return msg;
    return text;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
