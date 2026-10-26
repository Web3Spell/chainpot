import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded natively by Node on the server instead of being bundled: WalletConnect's logger pulls in
  // pino/thread-stream, which Turbopack can't bundle. (Privy's copy is kept off the server entirely —
  // see providers/WalletProviders.tsx.)
  serverExternalPackages: ["pino", "thread-stream"],
};

export default nextConfig;
