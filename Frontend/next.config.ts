import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // List packages that should be treated as external dependencies 
  // for the server build, preventing them from being bundled.
  serverExternalPackages: [
    'pino', 
    'thread-stream',
    // You may need to add other related modules if the error persists.
    // E.g., '@walletconnect/core' or other low-level dependencies.
  ],
  /* other config options here */
};

export default nextConfig;