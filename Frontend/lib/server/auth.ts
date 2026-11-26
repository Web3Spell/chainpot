import { createRemoteJWKSet, importSPKI, jwtVerify, type JWTVerifyGetKey } from "jose";

// Verifies a Privy identity token (ES256 JWT, iss "privy.io", aud = app id). Its `linked_accounts`
// claim carries the phone/email Privy has verified and the user's smart-wallet address, so the
// server never has to trust a contact or address the browser merely claims.

export interface PrivyIdentity {
  userId: string; // did:privy:…
  smartWallet?: `0x${string}`;
  /** Outside wallets (Rabby, MetaMask…) Privy has verified as linked to this user. Never the embedded signer. */
  externalWallets?: `0x${string}`[];
  /**
   * The address this user acts as in ChainPot: the smart wallet, or else the outside wallet the browser
   * says is active, but only if it is one of `externalWallets`. Set by `identityFromRequest`.
   */
  account?: `0x${string}`;
  email?: string;
  phone?: string;
}

export class AuthError extends Error {}

type Key = CryptoKey | Uint8Array | JWTVerifyGetKey;
let cachedKey: Promise<Key> | undefined;

/** PRIVY_VERIFICATION_KEY (SPKI PEM from the dashboard) if set, else the app's public JWKS. */
function verificationKey(appId: string): Promise<Key> {
  return (cachedKey ??= (async () => {
    const pem = process.env.PRIVY_VERIFICATION_KEY;
    if (pem) return importSPKI(pem.replace(/\\n/g, "\n"), "ES256");
    return createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${appId}/jwks.json`));
  })());
}

interface LinkedAccount {
  type?: string;
  address?: string;
  chain_type?: string;
  wallet_client_type?: string;
  connector_type?: string;
  number?: string;
  phone_number?: string;
  phoneNumber?: string;
}

export function parseLinkedAccounts(claim: unknown): Omit<PrivyIdentity, "userId"> {
  let list: LinkedAccount[] = [];
  try {
    list = (typeof claim === "string" ? JSON.parse(claim) : claim) as LinkedAccount[];
  } catch {
    list = [];
  }
  if (!Array.isArray(list)) list = [];
  const find = (t: string) => list.find((a) => a?.type === t);
  const wallet = find("smart_wallet")?.address;
  const phone = find("phone");
  const isAddress = (a: unknown): a is `0x${string}` => typeof a === "string" && /^0x[0-9a-fA-F]{40}$/.test(a);
  // An outside wallet must say where it came from; Privy's own embedded signer is excluded because the
  // user acts through their smart wallet, not that key.
  const externalWallets = list
    .filter(
      (a) =>
        a?.type === "wallet" &&
        (a.chain_type ?? "ethereum") === "ethereum" &&
        (a.wallet_client_type !== undefined || a.connector_type !== undefined) &&
        a.wallet_client_type !== "privy" &&
        a.connector_type !== "embedded" &&
        isAddress(a.address),
    )
    .map((a) => a.address as `0x${string}`);
  return {
    smartWallet: wallet && /^0x[0-9a-fA-F]{40}$/.test(wallet) ? (wallet as `0x${string}`) : undefined,
    externalWallets,
    email: find("email")?.address,
    phone: phone?.number ?? phone?.phone_number ?? phone?.phoneNumber,
  };
}

export async function verifyIdentityToken(token: string | null | undefined, opts?: { appId?: string; key?: Key }): Promise<PrivyIdentity> {
  const appId = opts?.appId ?? process.env.PRIVY_APP_ID ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) throw new AuthError("Privy is not configured");
  if (!token) throw new AuthError("missing identity token");
  try {
    const key = opts?.key ?? (await verificationKey(appId));
    const verifyOpts = { issuer: "privy.io", audience: appId, algorithms: ["ES256"] };
    const { payload } = typeof key === "function" ? await jwtVerify(token, key, verifyOpts) : await jwtVerify(token, key, verifyOpts);
    if (typeof payload.sub !== "string") throw new AuthError("token has no subject");
    return { userId: payload.sub, ...parseLinkedAccounts(payload.linked_accounts) };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("invalid identity token");
  }
}

/**
 * The address a verified user acts as. Smart wallet first. Otherwise the browser's active outside wallet
 * (`x-chainpot-address`), accepted only when the signed token lists it; with exactly one linked outside
 * wallet, that one.
 */
export function resolveAccount(identity: PrivyIdentity, claimed: string | null | undefined): `0x${string}` | undefined {
  if (identity.smartWallet) return identity.smartWallet;
  const ext = identity.externalWallets ?? [];
  const match = claimed ? ext.find((a) => a.toLowerCase() === claimed.toLowerCase()) : undefined;
  if (match) return match;
  return ext.length === 1 ? ext[0] : undefined;
}

/** Verify the request's identity token and resolve the account it acts as. */
export async function identityFromRequest(req: Request): Promise<PrivyIdentity> {
  const identity = await verifyIdentityToken(identityTokenFrom(req));
  return { ...identity, account: resolveAccount(identity, req.headers.get("x-chainpot-address")) };
}

/** Identity token from the `privy-id-token` header, or the cookie Privy sets once identity tokens are enabled. */
export function identityTokenFrom(req: Request): string | null {
  const header = req.headers.get("privy-id-token");
  if (header) return header;
  const cookie = req.headers.get("cookie") ?? "";
  return /(?:^|;\s*)privy-id-token=([^;]+)/.exec(cookie)?.[1] ?? null;
}
