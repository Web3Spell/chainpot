import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearIdentityToken, jwtExpiryMs, sharedIdentityToken, tokenHasSmartWallet } from "./identity-token";

const jwt = (expSec: number) => `h.${btoa(JSON.stringify({ exp: expSec })).replace(/=+$/, "")}.s`;

describe("shared identity token", () => {
  beforeEach(() => clearIdentityToken());

  it("reads exp from a JWT", () => {
    expect(jwtExpiryMs(jwt(2_000))).toBe(2_000_000);
    expect(jwtExpiryMs("not-a-jwt")).toBeUndefined();
  });

  it("asks Privy once for a burst of concurrent API calls", async () => {
    const fetcher = vi.fn(async () => jwt(10_000));
    const now = () => 1_000_000;
    const tokens = await Promise.all(Array.from({ length: 8 }, () => sharedIdentityToken(fetcher, "did:a", now)));
    expect(new Set(tokens).size).toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reuses the token until a minute before expiry, then refreshes", async () => {
    const fetcher = vi.fn(async () => jwt(1_000)); // expires at 1,000,000 ms
    await sharedIdentityToken(fetcher, "did:a", () => 900_000);
    await sharedIdentityToken(fetcher, "did:a", () => 939_000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await sharedIdentityToken(fetcher, "did:a", () => 941_000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never hands one user's token to another", async () => {
    const fetcher = vi.fn(async () => jwt(10_000));
    await sharedIdentityToken(fetcher, "did:a", () => 0);
    await sharedIdentityToken(fetcher, "did:b", () => 0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed fetch", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce(jwt(10_000));
    await expect(sharedIdentityToken(fetcher, "did:a", () => 0)).rejects.toThrow("429");
    await expect(sharedIdentityToken(fetcher, "did:a", () => 0)).resolves.toBe(jwt(10_000));
  });

  describe("smart wallet freshness (new accounts)", () => {
    const W = "0x00000000000000000000000000000000000000A1";
    const tok = (exp: number, wallet?: string) =>
      `h.${btoa(JSON.stringify({ exp, linked_accounts: JSON.stringify(wallet ? [{ type: "smart_wallet", address: wallet }] : [{ type: "email", address: "a@b.c" }]) })).replace(/=+$/, "")}.s`;

    it("reads the smart wallet from linked_accounts", () => {
      expect(tokenHasSmartWallet(tok(10_000, W), W.toLowerCase())).toBe(true);
      expect(tokenHasSmartWallet(tok(10_000), W)).toBe(false);
    });

    it("refreshes once and returns the new token when the first one predates the wallet", async () => {
      const fetcher = vi.fn().mockResolvedValueOnce(tok(10_000)).mockResolvedValueOnce(tok(10_000, W));
      const refresh = vi.fn(async () => undefined);
      const t = await sharedIdentityToken(fetcher, "did:new", () => 1_000_000, { wallet: W, refresh });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(tokenHasSmartWallet(t!, W)).toBe(true);
      await sharedIdentityToken(fetcher, "did:new", () => 1_000_000, { wallet: W, refresh });
      expect(fetcher).toHaveBeenCalledTimes(2); // second call served from cache
    });

    it("never caches a token without the wallet", async () => {
      const fetcher = vi.fn(async () => tok(10_000));
      await sharedIdentityToken(fetcher, "did:new", () => 1_000_000, { wallet: W, refresh: async () => undefined });
      await sharedIdentityToken(fetcher, "did:new", () => 1_000_000, { wallet: W, refresh: async () => undefined });
      expect(fetcher).toHaveBeenCalledTimes(4);
    });

    it("drops a token cached before the wallet existed once the wallet is known", async () => {
      const fetcher = vi.fn().mockResolvedValueOnce(tok(10_000)).mockResolvedValueOnce(tok(10_000, W));
      await sharedIdentityToken(fetcher, "did:new", () => 1_000_000); // signed in, wallet not created yet
      const t = await sharedIdentityToken(fetcher, "did:new", () => 1_000_000, { wallet: W });
      expect(tokenHasSmartWallet(t!, W)).toBe(true);
    });
  });
});
