import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Verdant is a small private app; keep config lean.
  // PWA (manifest + service worker) is added in a later phase.

  // Pin the file-tracing root to this project (a stray lockfile exists in $HOME).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
