import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium-min"],
};

export default nextConfig;
