import type { ChainPotAccount } from './account';

/** Call ChainPot's own API as the signed-in user (Privy identity token). */
export async function apiFetch<T>(account: ChainPotAccount, path: string, init?: RequestInit): Promise<T> {
  const token = await account.getIdentityToken?.();
  if (!token) throw new Error('Please sign in again.');
  const res = await fetch(path, { ...init, headers: {
      ...init?.headers,
      'privy-id-token': token,
      'content-type': 'application/json',
      // Which of the user's verified wallets they're acting as; the server only trusts it if the token lists it.
      ...(account.address ? { 'x-chainpot-address': account.address } : {}),
    } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `error ${res.status}`);
  return body as T;
}
