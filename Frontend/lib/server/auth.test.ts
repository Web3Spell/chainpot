import { describe, expect, it } from "vitest";
import { parseLinkedAccounts, resolveAccount } from "./auth";

const SMART = "0x00000000000000000000000000000000000000A1";
const RABBY = "0x00000000000000000000000000000000000000B2";
const OTHER = "0x00000000000000000000000000000000000000C3";
const EMBEDDED = "0x00000000000000000000000000000000000000D4";

describe("linked accounts → acting account", () => {
  it("lists verified outside wallets and never the embedded signer", () => {
    const ids = parseLinkedAccounts([
      { type: "wallet", address: EMBEDDED, chain_type: "ethereum", wallet_client_type: "privy", connector_type: "embedded" },
      { type: "wallet", address: RABBY, chain_type: "ethereum", wallet_client_type: "rabby_wallet", connector_type: "injected" },
      { type: "wallet", address: "So1ana1111111111111111111111111111111111111", chain_type: "solana", wallet_client_type: "phantom" },
      { type: "wallet", address: OTHER }, // no origin info → not trusted as an outside wallet
    ]);
    expect(ids.smartWallet).toBeUndefined();
    expect(ids.externalWallets).toEqual([RABBY]);
  });

  it("prefers the smart wallet over anything the browser claims", () => {
    expect(resolveAccount({ userId: "u", smartWallet: SMART, externalWallets: [RABBY] }, RABBY)).toBe(SMART);
  });

  it("uses the claimed outside wallet only when the token lists it", () => {
    const id = { userId: "u", externalWallets: [RABBY, OTHER] as `0x${string}`[] };
    expect(resolveAccount(id, OTHER.toLowerCase())).toBe(OTHER);
    expect(resolveAccount(id, "0x00000000000000000000000000000000000000ee")).toBeUndefined();
    expect(resolveAccount(id, null)).toBeUndefined(); // ambiguous: two wallets, no claim
  });

  it("falls back to the only linked outside wallet; nothing for embedded-only users", () => {
    expect(resolveAccount({ userId: "u", externalWallets: [RABBY] }, null)).toBe(RABBY);
    expect(resolveAccount({ userId: "u", externalWallets: [] }, EMBEDDED)).toBeUndefined();
  });
});
