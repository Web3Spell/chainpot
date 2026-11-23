import { describe, expect, it } from "vitest";
import { CRON_PATHS, cronDue, cronUrl, pingCron } from "./cron.ts";

describe("keeper cron pings", () => {
  it("is due on the first run and then every interval", () => {
    expect(cronDue(undefined, 1_000, 900)).toBe(true);
    expect(cronDue(1_000, 1_000 + 899_000, 900)).toBe(false);
    expect(cronDue(1_000, 1_000 + 900_000, 900)).toBe(true);
  });

  it("joins base URL and path cleanly", () => {
    expect(cronUrl("https://chainpot.fun/", "/api/cron/reminders")).toBe("https://chainpot.fun/api/cron/reminders");
    expect(cronUrl("https://chainpot.fun", "api/cron/autopay")).toBe("https://chainpot.fun/api/cron/autopay");
  });

  it("covers both cron routes", () => {
    expect(CRON_PATHS).toEqual(["/api/cron/reminders", "/api/cron/autopay"]);
  });

  it("sends the bearer secret Vercel Cron would send", async () => {
    let seen: { url: string; auth: string | null } | undefined;
    const fake = (async (url: string, init?: RequestInit) => {
      seen = { url, auth: new Headers(init?.headers).get("authorization") };
      return new Response('{"sent":0}', { status: 200 });
    }) as typeof fetch;
    const r = await pingCron("https://chainpot.fun", "s3cret", "/api/cron/reminders", fake);
    expect(seen).toEqual({ url: "https://chainpot.fun/api/cron/reminders", auth: "Bearer s3cret" });
    expect(r).toMatchObject({ ok: true, status: 200 });
  });
});
