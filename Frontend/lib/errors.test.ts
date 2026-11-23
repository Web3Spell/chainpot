import { describe, expect, it } from "vitest";
import { friendlyError } from "./errors";

describe("friendlyError", () => {
  it("explains an unconnected Chainlink VRF consumer from a raw bundler message", () => {
    const err = new Error('UserOperation reverted during simulation with reason: 0x79bfd401000000000000000000000000000000000000000000000000000000000000002a');
    expect(friendlyError(err)).toMatch(/fair-draw service isn't connected/);
  });

  it("recognises cancellations", () => {
    expect(friendlyError(new Error("User rejected the request."))).toBe("You cancelled the request.");
  });
});
