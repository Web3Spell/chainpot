// Calls the app's cron routes (/api/cron/reminders, /api/cron/autopay) from the always-on keeper.
//
// Vercel's Hobby plan only allows daily cron jobs, but reminders fire 2 hours before a due date and
// autopay should pay as soon as a round opens, so the keeper pings them every CRON_EVERY_SEC
// (default 15 min). vercel.json keeps a daily schedule as a safety net. Both routes are idempotent
// (sent reminders and payments are recorded), so an extra or overlapping run is harmless.

export const CRON_PATHS = ["/api/cron/reminders", "/api/cron/autopay"] as const;

/** Whether a ping round is due, given when the last one ran (ms) and the interval (s). */
export function cronDue(lastMs: number | undefined, nowMs: number, everySec: number) {
  return lastMs === undefined || nowMs - lastMs >= everySec * 1000;
}

/** Join the app's base URL and a route path without doubled or missing slashes. */
export function cronUrl(appUrl: string, path: string) {
  return `${appUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export async function pingCron(appUrl: string, secret: string, path: string, fetchImpl: typeof fetch = fetch) {
  const res = await fetchImpl(cronUrl(appUrl, path), {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.text();
  return { path, status: res.status, ok: res.ok, body: body.slice(0, 300) };
}
