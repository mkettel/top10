import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning instead of error, still builds even with issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
