import { describe, expect, it } from "vitest";
import { countryByCode, formatLocal, formatUsd, guessCountry } from "./currency";

describe("currency", () => {
  it("guesses the country from the browser language region", () => {
    expect(guessCountry(["en-IN", "en"])?.currency).toBe("INR");
    expect(guessCountry(["fil-PH"])?.code).toBe("PH");
    expect(guessCountry(["en"])).toBeUndefined();
  });

  it("maps 'somewhere else' to USD", () => {
    expect(countryByCode("ZZ")?.currency).toBe("USD");
    expect(countryByCode("in")?.currency).toBe("INR");
  });

  it("formats exact USD and a rounded local estimate", () => {
    expect(formatUsd(BigInt(50_000_000), "en-US")).toBe("$50.00");
    expect(formatLocal(BigInt(50_000_000), "INR", 84, "en-IN")).toBe("₹4,200");
    expect(formatLocal(BigInt(50_000_000), "USD", 1)).toBeUndefined();
    expect(formatLocal(BigInt(50_000_000), "INR", undefined)).toBeUndefined();
  });
});
