import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { Query } from "./db";
import { BodyTooLargeError, clientIp, rateLimit, RateLimitError, readJson } from "./limits";

let query: Query;
beforeAll(async () => {
  const pg = new PGlite();
  await pg.exec(readFileSync(fileURLToPath(new URL("../../../supabase/migrations/0006_rate_limits.sql", import.meta.url)), "utf8"));
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("rateLimit", () => {
  it("allows up to the limit per window, then 429 with retry-after", async () => {
    const now = 1_800_000_030;
    for (let i = 0; i < 3; i++) await rateLimit(query, "user:a:x", 3, 60, now);
    await expect(rateLimit(query, "user:a:x", 3, 60, now)).rejects.toMatchObject({ status: 429, retryAfter: 30 });
    await rateLimit(query, "user:b:x", 3, 60, now); // other keys unaffected
    await rateLimit(query, "user:a:x", 3, 60, now + 60); // next window resets
  });

  it("counts concurrent requests atomically", async () => {
    const now = 1_800_001_000;
    const results = await Promise.allSettled(Array.from({ length: 10 }, () => rateLimit(query, "ip:1:y", 5, 60, now)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rejected" && r.reason instanceof RateLimitError)).toHaveLength(5);
  });

  it("works without a database (dev)", async () => {
    await rateLimit(null, "k", 1, 60, 1);
    await expect(rateLimit(null, "k", 1, 60, 1)).rejects.toBeInstanceOf(RateLimitError);
  });
});

describe("request helpers", () => {
  it("caps body size", async () => {
    await expect(readJson(new Request("http://x", { method: "POST", body: "x".repeat(40_000) }))).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(await readJson(new Request("http://x", { method: "POST", body: '{"a":1}' }))).toEqual({ a: 1 });
    expect(await readJson(new Request("http://x", { method: "POST", body: "not json" }))).toEqual({});
  });
  it("reads the first forwarded IP", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 10.0.0.1" } }))).toBe("1.2.3.4");
    expect(clientIp(new Request("http://x"))).toBe("unknown");
  });
});
