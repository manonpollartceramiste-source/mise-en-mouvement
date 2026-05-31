import type { Metadata } from "next";
import type { ReactNode } from "react";

// Cabinet OS a son propre layout isolé :
// - pas de Header/Footer public
// - pas de PopupBanner
// - hérite des polices du RootLayout (app/layout.tsx)

export const metadata: Metadata = {
  title: {
    default: "Cabinet OS",
    template: "%s · Cabinet OS",
  },
  robots: { index: false, follow: false },
};

export default function OsLayout({ children }: { children: ReactNode }) {
  return (
    // min-h-screen pour que le fond couvre toujours l'écran
    <div className="min-h-screen bg-sand-50 text-ink-900">{children}</div>
  );
}
