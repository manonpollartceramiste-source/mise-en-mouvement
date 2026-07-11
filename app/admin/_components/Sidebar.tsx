"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { signOut } from "../login/actions";

// ── Nav structure ────────────────────────────────────────────────

type SubItem = {
  label: string;
  href: string;
  tab?: string | null;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  sub?: SubItem[];
};

function GlobeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9z" />
      <path d="M3 12h18" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-3.885a.563.563 0 00-.652 0L4.91 20.56a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function WrenchIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <DashboardIcon />,
  },
  {
    label: "Site & coordonnées",
    href: "/admin/parametres",
    icon: <GlobeIcon />,
    sub: [
      { label: "Identité & Contact", href: "/admin/parametres", tab: null },
      { label: "Réseaux & CTA", href: "/admin/parametres?tab=reseaux", tab: "reseaux" },
      { label: "Horaires", href: "/admin/parametres?tab=horaires", tab: "horaires" },
    ],
  },
  {
    label: "Offres",
    href: "/admin/offres",
    icon: <TagIcon />,
  },
  {
    label: "Coachs du site",
    href: "/admin/coachs",
    icon: <UsersIcon />,
  },
  {
    label: "Médiathèque",
    href: "/admin/medias",
    icon: <PhotoIcon />,
  },
  {
    label: "Contenus",
    href: "/admin/contenu",
    icon: <DocumentIcon />,
    sub: [
      { label: "FAQ", href: "/admin/contenu", tab: null },
      { label: "Pop-ups", href: "/admin/contenu?tab=popups", tab: "popups" },
      { label: "Textes du site", href: "/admin/contenu?tab=textes", tab: "textes" },
    ],
  },
  {
    label: "Avis",
    href: "/admin/avis",
    icon: <StarIcon />,
  },
  {
    label: "Gestion",
    href: "/admin/outils",
    icon: <WrenchIcon />,
    sub: [
      { label: "Demandes clients", href: "/admin/outils", tab: null },
      { label: "Mentions légales", href: "/admin/outils?tab=mentions", tab: "mentions" },
    ],
  },
];

// ── SidebarNav (uses useSearchParams, must be wrapped in Suspense) ──

function SidebarNav({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");

  function isItemActive(item: NavItem): boolean {
    if (item.sub) {
      return pathname === item.href || pathname.startsWith(item.href + "/") || pathname.startsWith(item.href + "?");
    }
    if (item.href === "/admin") {
      return pathname === "/admin";
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function isSubItemActive(sub: SubItem): boolean {
    const pathMatches = pathname === sub.href.split("?")[0];
    if (!pathMatches) return false;
    if (sub.tab === null || sub.tab === undefined) {
      return currentTab === null;
    }
    return currentTab === sub.tab;
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <ul className="space-y-0.5">
        {navItems.map((item) => {
          const active = isItemActive(item);
          const hasSub = item.sub && item.sub.length > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={hasSub ? undefined : onClose}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active && !hasSub
                    ? "bg-sand-100 text-ink-900"
                    : active && hasSub
                    ? "text-ink-900"
                    : "text-taupe-600 hover:bg-sand-50 hover:text-ink-900"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
              {hasSub && active && (
                <ul className="mt-0.5 space-y-0.5 pl-8">
                  {item.sub!.map((sub) => {
                    const subActive = isSubItemActive(sub);
                    return (
                      <li key={sub.href}>
                        <Link
                          href={sub.href}
                          onClick={onClose}
                          className={`block rounded-xl px-3 py-1.5 text-xs transition-colors ${
                            subActive
                              ? "bg-sand-100 font-medium text-ink-900"
                              : "text-taupe-500 hover:bg-sand-50 hover:text-ink-900"
                          }`}
                        >
                          {sub.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────

export function Sidebar({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false);

  const truncatedEmail =
    userEmail.length > 26 ? userEmail.slice(0, 24) + "…" : userEmail;

  return (
    <>
      {/* Mobile header (fixe, visible uniquement mobile) */}
      <div className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-taupe-200/50 bg-white px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-taupe-600 hover:bg-sand-100 hover:text-ink-900 transition-colors"
        >
          <HamburgerIcon />
        </button>
        <span className="font-serif text-base text-ink-900">Administration</span>
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-taupe-200/60 bg-white transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* En-tête sidebar */}
        <div className="flex items-center justify-between border-b border-taupe-200/40 px-4 py-4">
          <Link href="/admin" className="font-serif text-base text-ink-900">
            Mise en Mouvement
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-taupe-400 hover:bg-sand-100 hover:text-ink-900 transition-colors lg:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Navigation */}
        <Suspense fallback={null}>
          <SidebarNav onClose={() => setOpen(false)} />
        </Suspense>

        {/* Lien "Voir le site" */}
        <div className="border-t border-taupe-200/40 px-3 py-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-taupe-500 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
            Voir le site ↗
          </Link>
        </div>

        {/* Footer : email + déconnexion */}
        <div className="border-t border-taupe-200/40 px-3 py-3">
          <p
            className="truncate px-3 text-xs text-taupe-400"
            title={userEmail}
          >
            {truncatedEmail}
          </p>
          <form action={signOut} className="mt-2">
            <button
              type="submit"
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-taupe-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
