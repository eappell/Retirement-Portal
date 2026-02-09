import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker deployment
  // Empty turbopack config for Next.js 16 compatibility
  turbopack: {},
};

export default nextConfig;
