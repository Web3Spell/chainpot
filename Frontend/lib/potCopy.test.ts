import { describe, expect, it } from "vitest";
import { actionCopy, relativeTime } from "./potCopy";

const NOW = 1_800_000_000;
const money = (v: bigint) => `$${Number(v) / 1e6}`;

describe("actionCopy", () => {
  it("makes payment due the urgent, single call to action", () => {
    expect(actionCopy({ kind: "pay", amount: BigInt(50_000_000), deadline: NOW + 3 * 3600 }, NOW, money)).toEqual({ status: "Pay $50 — due in 3 h", tone: "danger", cta: "Pay now", urgent: true });
    expect(actionCopy({ kind: "pay", amount: BigInt(50_000_000), deadline: NOW + 3 * 86400 }, NOW, money)).toMatchObject({ tone: "warn", urgent: false });
  });
  it("speaks plainly about waiting states", () => {
    expect(actionCopy({ kind: "waitingForMembers", joined: 3, expected: 4 }, NOW, money).status).toBe("Waiting for 1 more person to join");
    expect(actionCopy({ kind: "drawing" }, NOW, money).cta).toBeUndefined();
  });
  it("formats relative times", () => {
    expect(relativeTime(NOW + 90, NOW)).toBe("in 2 min");
    expect(relativeTime(NOW - 1, NOW)).toBe("now");
  });
});
