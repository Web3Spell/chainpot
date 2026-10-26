import { PREF_FOR, remindersFor, renderReminder, type PotState, type Reminder } from "@/lib/reminders";
import type { Query } from "./db";
import { recipientsFor, type Recipient } from "./profiles";

export type Channel = "email" | "sms" | "whatsapp";
export type Sender = (to: string, msg: { subject: string; body: string }) => Promise<void>;

const CHANNEL_FOR_KIND: Record<Recipient["contacts"][number]["kind"], Channel> = { email: "email", phone: "sms", whatsapp: "whatsapp" };

/** Senders configured from env. A channel without credentials is simply not sent (logged in dry runs). */
export function sendersFromEnv(env = process.env): Partial<Record<Channel, Sender>> {
  const out: Partial<Record<Channel, Sender>> = {};
  if (env.RESEND_API_KEY && env.REMINDER_EMAIL_FROM) {
    out.email = async (to, { subject, body }) => {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({ from: env.REMINDER_EMAIL_FROM, to, subject, text: body }),
      });
      if (!res.ok) throw new Error(`resend ${res.status}`);
    };
  }
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
    const twilio = (from: string, to: string, body: string) =>
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ From: from, To: to, Body: body }),
      }).then((res) => {
        if (!res.ok) throw new Error(`twilio ${res.status}`);
      });
    // India SMS needs DLT-registered templates; business-initiated WhatsApp needs approved templates.
    // Plain bodies work in Twilio sandboxes — switch to Content/template SIDs for production.
    if (env.TWILIO_SMS_FROM) out.sms = (to, m) => twilio(env.TWILIO_SMS_FROM!, to, m.body);
    if (env.TWILIO_WHATSAPP_FROM) out.whatsapp = (to, m) => twilio(`whatsapp:${env.TWILIO_WHATSAPP_FROM}`, `whatsapp:${to}`, m.body);
  }
  return out;
}

export interface RunDeps {
  query: Query;
  states: PotState[];
  senders: Partial<Record<Channel, Sender>>;
  now: number;
  appUrl: string;
  dryRun?: boolean;
}

export interface RunSummary {
  reminders: number;
  sent: number;
  skippedDuplicate: number;
  skippedNoChannel: number;
  failed: number;
  planned: { key: string; channel: Channel }[];
}

/**
 * Compute reminders and deliver each (recipient, reminder, channel) at most once. The send log row is
 * claimed BEFORE sending (unique key), so overlapping runs can't double-send; a failed send releases
 * it so the next run retries.
 */
export async function runReminders(d: RunDeps): Promise<RunSummary> {
  const reminders: Reminder[] = d.states.flatMap((s) => remindersFor(s, d.now));
  const recipients = new Map((await recipientsFor(d.query, [...new Set(reminders.map((r) => r.address))])).map((r) => [r.address, r]));
  const summary: RunSummary = { reminders: reminders.length, sent: 0, skippedDuplicate: 0, skippedNoChannel: 0, failed: 0, planned: [] };

  for (const r of reminders) {
    const rec = recipients.get(r.address.toLowerCase());
    if (!rec || !rec.prefs[PREF_FOR[r.kind]]) continue;
    const msg = renderReminder(r, d.appUrl);
    for (const contact of rec.contacts) {
      const channel = CHANNEL_FOR_KIND[contact.kind];
      const send = d.senders[channel];
      if (d.dryRun) {
        summary.planned.push({ key: r.key, channel });
        continue;
      }
      if (!send) {
        summary.skippedNoChannel++;
        continue;
      }
      const claimed = await d.query<{ id: number }>(
        `insert into notification_log (address, reminder, channel) values ($1, $2, $3)
         on conflict (address, reminder, channel) do nothing returning id`,
        [rec.address, r.key, channel],
      );
      if (!claimed.length) {
        summary.skippedDuplicate++;
        continue;
      }
      try {
        await send(contact.value, msg);
        summary.sent++;
      } catch (err) {
        console.error("reminder send failed", channel, r.key, err);
        await d.query(`delete from notification_log where id = $1`, [claimed[0].id]);
        summary.failed++;
      }
    }
  }
  return summary;
}
