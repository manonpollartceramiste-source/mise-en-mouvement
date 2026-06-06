import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  outputFileTracingIncludes: {
    // Bundle body-map.png with the PDF API route so readFileSync works on Vercel
    "/api/pdf/bilan/[id]": ["./public/pdf-assets/body-map.png"],
  },
};

export default nextConfig;
