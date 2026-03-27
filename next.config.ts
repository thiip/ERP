import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BASE_PATH: "",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
