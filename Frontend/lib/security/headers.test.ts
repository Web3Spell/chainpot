import { describe, expect, it } from "vitest";
import { buildCsp, securityHeaders } from "./headers";

describe("security headers", () => {
  it("locks down framing, sniffing and transport", () => {
    const h = Object.fromEntries(securityHeaders({ rpcUrls: [] }).map((x) => [x.key, x.value]));
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Strict-Transport-Security"]).toContain("max-age=63072000");
    expect(h["Content-Security-Policy-Report-Only"]).toContain("frame-ancestors 'none'");
    expect(h["Content-Security-Policy"]).toBeUndefined();
  });

  it("enforces CSP when asked", () => {
    const keys = securityHeaders({ rpcUrls: [], enforceCsp: true }).map((x) => x.key);
    expect(keys).toContain("Content-Security-Policy");
  });

  it("allows only the configured RPC and indexer origins plus wallet providers", () => {
    const csp = buildCsp({ rpcUrls: ["https://rpc.example.com/v2/key"], indexerUrl: "https://index.example.com/api" });
    const connect = csp.split("; ").find((d) => d.startsWith("connect-src"))!;
    expect(connect).toContain("https://rpc.example.com");
    expect(connect).not.toContain("/v2/key"); // never leak RPC keys into a header
    expect(connect).toContain("https://index.example.com");
    expect(connect).toContain("https://auth.privy.io");
    expect(connect).toContain("https://*.web3modal.org"); // WalletConnect AppKit config
    expect(connect).not.toContain("localhost");
    expect(csp).toContain("object-src 'none'");
    expect(buildCsp({ rpcUrls: [], dev: true })).toContain("ws://localhost:*");
  });
});
