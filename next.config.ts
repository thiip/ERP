import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/projectum-erp",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/projectum-erp",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
