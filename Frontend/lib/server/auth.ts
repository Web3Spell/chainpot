import { createRemoteJWKSet, importSPKI, jwtVerify, type JWTVerifyGetKey } from "jose";

// Verifies a Privy identity token (ES256 JWT, iss "privy.io", aud = app id). Its `linked_accounts`
// claim carries the phone/email Privy has verified and the user's smart-wallet address, so the
// server never has to trust a contact or address the browser merely claims.

export interface PrivyIdentity {
  userId: string; // did:privy:…
  smartWallet?: `0x${string}`;
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
  return {
    smartWallet: wallet && /^0x[0-9a-fA-F]{40}$/.test(wallet) ? (wallet as `0x${string}`) : undefined,
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

/** Identity token from the `privy-id-token` header, or the cookie Privy sets once identity tokens are enabled. */
export function identityTokenFrom(req: Request): string | null {
  const header = req.headers.get("privy-id-token");
  if (header) return header;
  const cookie = req.headers.get("cookie") ?? "";
  return /(?:^|;\s*)privy-id-token=([^;]+)/.exec(cookie)?.[1] ?? null;
}
