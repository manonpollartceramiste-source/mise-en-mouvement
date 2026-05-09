import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { site } from "@/lib/content/site";
import { loadTexts } from "@/lib/content/texts.server";
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

export async function generateMetadata(): Promise<Metadata> {
  const texts = await loadTexts();
  const name = texts.siteName;
  return {
    title: {
      default: `${name} — ${site.tagline}`,
      template: `%s · ${name}`,
    },
    description: site.description,
    metadataBase: new URL(site.url),
    openGraph: {
      title: name,
      description: site.description,
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-sand-50 text-ink-900">
        {children}
      </body>
    </html>
  );
}
