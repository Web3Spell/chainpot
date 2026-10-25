import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { bytesToHex, getAddress, hexToBytes, isAddress } from "viem";
import type { Engine } from "./pot";

// Invite lists are public by nature (a proof only lets the listed address join), so the whole list
// can travel in a share link. It goes in the URL *fragment* so it never reaches a server log.

export interface NormalizedAddresses {
  valid: `0x${string}`[];
  invalid: string[];
  duplicates: string[];
}

export function normalizeAddresses(entries: string[]): NormalizedAddresses {
  const seen = new Set<string>();
  const valid: `0x${string}`[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  for (const raw of entries) {
    const entry = raw.trim();
    if (!entry) continue;
    if (!isAddress(entry, { strict: false })) {
      invalid.push(entry);
      continue;
    }
    const checksummed = getAddress(entry);
    if (seen.has(checksummed)) {
      duplicates.push(checksummed);
      continue;
    }
    seen.add(checksummed);
    valid.push(checksummed);
  }
  return { valid, invalid, duplicates };
}

export function buildInviteTree(addresses: `0x${string}`[]) {
  // StandardMerkleTree sorts leaves, so the root doesn't depend on list order. The leaf encoding
  // matches the contract: keccak256(bytes.concat(keccak256(abi.encode(addr)))).
  return StandardMerkleTree.of(
    addresses.map((a) => [a]),
    ["address"],
  );
}

export function inviteRoot(addresses: `0x${string}`[]) {
  return buildInviteTree(addresses).root as `0x${string}`;
}

export function proofFor(addresses: `0x${string}`[], member: string): `0x${string}`[] | undefined {
  const tree = buildInviteTree(addresses);
  for (const [i, v] of tree.entries()) {
    if ((v[0] as string).toLowerCase() === member.toLowerCase()) return tree.getProof(i) as `0x${string}`[];
  }
  return undefined;
}

// ---- Share-link encoding: 20 raw bytes per address, base64url ----

export function encodeInvite(addresses: `0x${string}`[]): string {
  const bytes = new Uint8Array(addresses.length * 20);
  addresses.forEach((a, i) => bytes.set(hexToBytes(a), i * 20));
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInvite(encoded: string): `0x${string}`[] | undefined {
  try {
    const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    if (bin.length === 0 || bin.length % 20 !== 0) return undefined;
    const out: `0x${string}`[] = [];
    for (let i = 0; i < bin.length; i += 20) {
      const chunk = new Uint8Array(20);
      for (let j = 0; j < 20; j++) chunk[j] = bin.charCodeAt(i + j);
      out.push(getAddress(bytesToHex(chunk)));
    }
    return out;
  } catch {
    return undefined;
  }
}

export function inviteLink(origin: string, engine: Engine, potId: number | bigint | string, addresses: `0x${string}`[]) {
  return `${origin}/pots/${String(potId)}?engine=${engine}#invite=${encodeInvite(addresses)}`;
}

export function readInviteFromHash(hash: string): `0x${string}`[] | undefined {
  const match = /(?:^#|&)invite=([A-Za-z0-9_-]+)/.exec(hash);
  return match ? decodeInvite(match[1]) : undefined;
}

// ---- Local cache (so creators and invitees can re-share without the link) ----

const rootKey = (root: string) => `chainpot:invite:${root.toLowerCase()}`;

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveInvite(addresses: `0x${string}`[]) {
  try {
    localStorage.setItem(rootKey(inviteRoot(addresses)), JSON.stringify(addresses));
  } catch {
    // storage unavailable (private mode) — the share link still works
  }
}

/** Load a cached invite list whose rebuilt root matches `root`. Reads the legacy format too. */
export function loadInvite(root: string): `0x${string}`[] | undefined {
  const candidates = [safeGet(rootKey(root)), safeGet(`merkle_${root}`)];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown[];
      const list = parsed.map((e) => (typeof e === "string" ? e : (e as { address: string }).address));
      const { valid } = normalizeAddresses(list);
      if (valid.length && inviteRoot(valid).toLowerCase() === root.toLowerCase()) return valid;
    } catch {
      // ignore corrupt entries
    }
  }
  return undefined;
}
