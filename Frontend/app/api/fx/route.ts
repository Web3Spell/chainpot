import { NextResponse } from "next/server";
import { COUNTRIES } from "@/lib/currency";

// USD → local rates for the display currencies, cached for an hour. Source: ExchangeRate-API's open
// endpoint (no key; attribution required — shown in the country picker).
export const revalidate = 3600;

const WANTED = new Set(COUNTRIES.map((c) => c.currency));

export async function GET() {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate } });
    if (!res.ok) throw new Error(`fx source ${res.status}`);
    const body = (await res.json()) as { result: string; rates: Record<string, number>; time_last_update_unix: number };
    if (body.result !== "success") throw new Error("fx source error");
    const rates = Object.fromEntries(Object.entries(body.rates).filter(([k]) => WANTED.has(k)));
    return NextResponse.json(
      { base: "USD", rates, updatedAt: body.time_last_update_unix },
      { headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } },
    );
  } catch (err) {
    console.error("fx error", err);
    // Display falls back to USD only.
    return NextResponse.json({ base: "USD", rates: { USD: 1 }, updatedAt: 0 }, { status: 503 });
  }
}
