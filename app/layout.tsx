import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Cormorant_Garamond } from "next/font/google";
import { site } from "@/lib/content/site";
import { loadTexts } from "@/lib/content/texts.server";
import { loadSettings } from "@/lib/content/settings.server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["italic"],
});

export async function generateMetadata(): Promise<Metadata> {
  const [texts, settings] = await Promise.all([loadTexts(), loadSettings()]);
  const name = settings.companyName || texts.siteName;
  const tagline = settings.tagline || site.tagline;
  const description = settings.tagline || site.description;
  return {
    title: {
      default: `${name} — ${tagline}`,
      template: `%s · ${name}`,
    },
    description,
    metadataBase: new URL(site.url),
    openGraph: {
      title: name,
      description,
      type: "website",
      locale: "fr_FR",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-sand-50 text-ink-900">
        {children}
      </body>
    </html>
  );
}
