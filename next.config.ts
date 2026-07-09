import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
  outputFileTracingIncludes: {
    // Bundle body-map.png with the PDF API route so readFileSync works on Vercel
    "/api/pdf/bilan/[id]": ["./public/pdf-assets/body-map.png"],
  },
  images: {
    remotePatterns: [
      {
        // Supabase Storage — images et vidéos médiathèque
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
