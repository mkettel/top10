import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Warning instead of error, still builds even with issues
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This will still show errors in your editor but won't fail the build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
