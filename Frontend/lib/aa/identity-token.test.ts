import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearIdentityToken, jwtExpiryMs, sharedIdentityToken } from "./identity-token";

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
});
