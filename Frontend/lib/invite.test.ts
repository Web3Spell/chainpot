import { describe, expect, it } from "vitest";
import { concat, encodeAbiParameters, keccak256 } from "viem";
import { decodeInvite, encodeInvite, inviteRoot, normalizeAddresses, proofFor, readInviteFromHash } from "./invite";
import { maxAllowedBid, minBidStep } from "./pot";

const A = "0x00000000000000000000000000000000000000A1";
const B = "0x00000000000000000000000000000000000000b2";
const C = "0x00000000000000000000000000000000000000c3";

describe("invite lists", () => {
  it("dedupes case-insensitively and reports invalid entries", () => {
    const n = normalizeAddresses([A, A.toLowerCase(), "junk", B, ` ${C} `]);
    expect(n.valid).toHaveLength(3);
    expect(n.duplicates).toHaveLength(1);
    expect(n.invalid).toEqual(["junk"]);
  });

  it("round-trips through the share link", () => {
    const { valid } = normalizeAddresses([A, B, C]);
    const enc = encodeInvite(valid);
    expect(decodeInvite(enc)).toEqual(valid);
    expect(readInviteFromHash(`#invite=${enc}`)).toEqual(valid);
    expect(decodeInvite("not-base64!")).toBeUndefined();
  });

  it("root does not depend on order", () => {
    const { valid } = normalizeAddresses([A, B, C]);
    expect(inviteRoot([...valid].reverse())).toBe(inviteRoot(valid));
  });

  it("proofs verify with the contract's leaf encoding and OZ MerkleProof", () => {
    const { valid } = normalizeAddresses([A, B, C]);
    for (const member of valid) {
      let h = keccak256(concat([keccak256(encodeAbiParameters([{ type: "address" }], [member]))]));
      for (const p of proofFor(valid, member)!) h = keccak256(BigInt(h) < BigInt(p) ? concat([h, p]) : concat([p, h]));
      expect(h).toBe(inviteRoot(valid));
    }
  });
});

describe("bid limits", () => {
  it("applies the 2% step and the pot ceiling", () => {
    expect(minBidStep(BigInt(100_000_000))).toBe(BigInt(2_000_000));
    expect(minBidStep(BigInt(10))).toBe(BigInt(1));
    expect(maxAllowedBid(BigInt(400_000_000), BigInt(0), false)).toBe(BigInt(399_999_999));
    expect(maxAllowedBid(BigInt(400_000_000), BigInt(300_000_000), true)).toBe(BigInt(294_000_000));
    expect(maxAllowedBid(BigInt(0), BigInt(0), false)).toBe(BigInt(0));
  });
});
