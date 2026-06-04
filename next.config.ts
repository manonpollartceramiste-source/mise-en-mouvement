import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium-min"],
  // playwright-core loads browsers.json via a dynamic path at runtime.
  // Vercel's file tracer can't detect it automatically → force-include it.
  outputFileTracingIncludes: {
    "/api/pdf/bilan/[id]": [
      "./node_modules/playwright-core/**/*.json",
      "./node_modules/@sparticuz/chromium-min/**",
    ],
  },
};

export default nextConfig;
