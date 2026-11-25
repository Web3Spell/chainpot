import type { NextConfig } from "next";
import { securityHeaders } from "./lib/security/headers";
import { PUBLIC_RPC_URL } from "./config/network";

const nextConfig: NextConfig = {
  // Loaded natively by Node on the server instead of being bundled: WalletConnect's logger pulls in
  // pino/thread-stream, which Turbopack can't bundle. (Privy's copy is kept off the server entirely —
  // see providers/WalletProviders.tsx.)
  serverExternalPackages: ["pino", "thread-stream"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          rpcUrls: [PUBLIC_RPC_URL],
          indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL,
          dev: process.env.NODE_ENV !== "production",
          enforceCsp: process.env.CSP_ENFORCE === "true",
        }),
      },
    ];
  },
};

export default nextConfig;
