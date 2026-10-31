import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  turbopack: {},
  compress: true,
  poweredByHeader: false,
  experimental: {
    // Tree-shake icon imports instead of pulling the whole icon set into every route.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
