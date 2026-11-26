import { countryByCode } from "@/lib/currency";
import type { Query } from "./db";
import type { PrivyIdentity } from "./auth";

export type Channel = "email" | "sms" | "whatsapp";

export interface ReminderPrefs {
  payment_due: boolean;
  round_started: boolean;
  bidding_open: boolean;
  you_received: boolean;
  missed: boolean;
}

export interface Profile {
  country: string | null;
  currency: string | null;
  displayName: string | null;
  /** Verified contact values come from the Privy identity token, never from the client. */
  contacts: { email?: string; phone?: string };
  channels: Record<Channel, boolean>;
  prefs: ReminderPrefs;
}

const DEFAULT_PREFS: ReminderPrefs = { payment_due: true, round_started: true, bidding_open: true, you_received: true, missed: true };
const PREF_KEYS = Object.keys(DEFAULT_PREFS) as (keyof ReminderPrefs)[];

export interface ProfileInput {
  country?: unknown;
  displayName?: unknown;
  channels?: Partial<Record<Channel, unknown>>;
  prefs?: Partial<Record<keyof ReminderPrefs, unknown>>;
}

export class ProfileError extends Error {}

export async function getProfile(query: Query, identity: PrivyIdentity): Promise<Profile> {
  const [p] = await query<{ country: string | null; currency: string | null; display_name: string | null }>(
    `select country, currency, display_name from profiles where user_id = $1`,
    [identity.userId],
  );
  const [n] = await query<ReminderPrefs & { email_enabled: boolean; sms_enabled: boolean; whatsapp_enabled: boolean }>(
    `select payment_due, round_started, bidding_open, you_received, missed, email_enabled, sms_enabled, whatsapp_enabled
       from notification_prefs where user_id = $1`,
    [identity.userId],
  );
  return {
    country: p?.country?.trim() ?? null,
    currency: p?.currency?.trim() ?? null,
    displayName: p?.display_name ?? null,
    contacts: { email: identity.email, phone: identity.phone },
    channels: { email: !!n?.email_enabled, sms: !!n?.sms_enabled, whatsapp: !!n?.whatsapp_enabled },
    prefs: n ? Object.fromEntries(PREF_KEYS.map((k) => [k, n[k]])) as unknown as ReminderPrefs : DEFAULT_PREFS,
  };
}

/** Upsert the caller's profile. Address and contacts come only from the verified identity. */
export async function saveProfile(query: Query, identity: PrivyIdentity, input: ProfileInput): Promise<Profile> {
  const country = input.country === undefined ? undefined : countryByCode(typeof input.country === "string" ? input.country : "");
  if (input.country !== undefined && !country) throw new ProfileError("unknown country");
  if (input.displayName !== undefined && (typeof input.displayName !== "string" || input.displayName.length > 60)) {
    throw new ProfileError("displayName must be a string of at most 60 characters");
  }
  const channels: Record<Channel, boolean> = { email: false, sms: false, whatsapp: false };
  for (const c of ["email", "sms", "whatsapp"] as Channel[]) {
    const v = input.channels?.[c];
    if (v !== undefined && typeof v !== "boolean") throw new ProfileError(`channels.${c} must be boolean`);
    channels[c] = v === true;
  }
  if (channels.email && !identity.email) throw new ProfileError("sign in with an email to get email reminders");
  if ((channels.sms || channels.whatsapp) && !identity.phone) throw new ProfileError("sign in with a phone number to get SMS/WhatsApp reminders");
  const prefs = { ...DEFAULT_PREFS };
  for (const k of PREF_KEYS) {
    const v = input.prefs?.[k];
    if (v !== undefined && typeof v !== "boolean") throw new ProfileError(`prefs.${k} must be boolean`);
    if (typeof v === "boolean") prefs[k] = v;
  }

  await query(
    `insert into profiles (user_id, address, country, currency, display_name)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id) do update set
       address      = coalesce(excluded.address, profiles.address),
       country      = coalesce(excluded.country, profiles.country),
       currency     = coalesce(excluded.currency, profiles.currency),
       display_name = coalesce(excluded.display_name, profiles.display_name),
       updated_at   = now()`,
    [identity.userId, (identity.account ?? identity.smartWallet)?.toLowerCase() ?? null, country?.code ?? null, country?.currency ?? null, (input.displayName as string | undefined) ?? null],
  );

  // Contact rows mirror the verified identity for enabled channels only.
  await query(`delete from contact_methods where user_id = $1`, [identity.userId]);
  const contacts: [string, string | undefined][] = [
    ["email", channels.email ? identity.email : undefined],
    ["phone", channels.sms ? identity.phone : undefined],
    ["whatsapp", channels.whatsapp ? identity.phone : undefined],
  ];
  for (const [kind, value] of contacts) {
    if (value) await query(`insert into contact_methods (user_id, kind, value, verified_at) values ($1, $2, $3, now())`, [identity.userId, kind, value]);
  }

  await query(
    `insert into notification_prefs (user_id, payment_due, round_started, bidding_open, you_received, missed, email_enabled, sms_enabled, whatsapp_enabled)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (user_id) do update set
       payment_due = excluded.payment_due, round_started = excluded.round_started, bidding_open = excluded.bidding_open,
       you_received = excluded.you_received, missed = excluded.missed,
       email_enabled = excluded.email_enabled, sms_enabled = excluded.sms_enabled, whatsapp_enabled = excluded.whatsapp_enabled`,
    [identity.userId, prefs.payment_due, prefs.round_started, prefs.bidding_open, prefs.you_received, prefs.missed, channels.email, channels.sms, channels.whatsapp],
  );
  return getProfile(query, identity);
}

export interface Recipient {
  address: string; // lowercase
  prefs: ReminderPrefs;
  contacts: { kind: "email" | "phone" | "whatsapp"; value: string }[];
  currency: string | null;
}

/** Reachable recipients for a set of on-chain addresses (notifier side). */
export async function recipientsFor(query: Query, addresses: string[]): Promise<Recipient[]> {
  if (!addresses.length) return [];
  const rows = await query<ReminderPrefs & { address: string; currency: string | null; kind: Recipient["contacts"][number]["kind"]; value: string }>(
    `select lower(p.address) as address, p.currency, c.kind, c.value,
            n.payment_due, n.round_started, n.bidding_open, n.you_received, n.missed
       from profiles p
       join contact_methods c on c.user_id = p.user_id and c.verified_at is not null
       join notification_prefs n on n.user_id = p.user_id
      where lower(p.address) = any($1)`,
    [addresses.map((a) => a.toLowerCase())],
  );
  const byAddress = new Map<string, Recipient>();
  for (const r of rows) {
    const rec = byAddress.get(r.address) ?? {
      address: r.address,
      currency: r.currency?.trim() ?? null,
      prefs: Object.fromEntries(PREF_KEYS.map((k) => [k, r[k]])) as unknown as ReminderPrefs,
      contacts: [],
    };
    rec.contacts.push({ kind: r.kind, value: r.value });
    byAddress.set(r.address, rec);
  }
  return [...byAddress.values()];
}
