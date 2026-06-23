import Link from "next/link";
import type { ReactNode } from "react";
import type { Profile, UserRole } from "@/lib/os/types";
import { osSignOut } from "@/app/os/login/actions";
import { NavLinks, NavLinksHorizontal } from "./NavLinks";

type NavItem = { label: string; href: string };

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  client: [
    { label: "Tableau de bord", href: "/os/client" },
    { label: "Mes séances", href: "/os/client/seances" },
    { label: "Mes mesures", href: "/os/client/mesures" },
    { label: "Mes objectifs", href: "/os/client/objectifs" },
    { label: "Mon profil", href: "/os/client/profil" },
  ],
  coach: [
    { label: "Tableau de bord", href: "/os/coach" },
    { label: "Calendrier", href: "/os/coach/calendar" },
    { label: "Disponibilités", href: "/os/coach/disponibilites" },
    { label: "Mes clients", href: "/os/coach/clients" },
    { label: "Bilan mouvement", href: "/os/coach/bilan-mouvement" },
    { label: "Devis", href: "/os/coach/devis" },
    { label: "Factures", href: "/os/coach/factures" },
    { label: "Paramètres", href: "/os/coach/settings" },
  ],
  admin: [
    { label: "Tableau de bord", href: "/os/admin" },
    { label: "Coachs", href: "/os/admin/coachs" },
    { label: "Clients", href: "/os/admin/clients" },
    { label: "Site public", href: "/admin" },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Coach",
  client: "Client",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-taupe-700 text-sand-50",
  coach: "bg-ink-900 text-sand-50",
  client: "bg-sand-200 text-taupe-700",
};

type OsShellProps = {
  profile: Profile;
  title?: string;
  children: ReactNode;
};

export function OsShell({ profile, title, children }: OsShellProps) {
  const nav = NAV_BY_ROLE[profile.role] ?? [];

  return (
    <div className="flex min-h-screen bg-sand-50">
      {/* ── Sidebar desktop ── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-taupe-300/30 bg-white lg:flex">
        <SidebarContent profile={profile} nav={nav} />
      </aside>

      {/* ── Colonne principale ── */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-taupe-300/30 bg-white px-5 py-4">
          <div className="flex items-center gap-3 lg:hidden">
            <Link href="/" className="block">
              <p className="text-[10px] uppercase tracking-[0.2em] text-taupe-500">
                Cabinet OS
              </p>
            </Link>
          </div>
          {title && (
            <h1 className="hidden text-lg font-medium text-ink-900 lg:block">
              {title}
            </h1>
          )}
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-taupe-600 sm:block">
              {profile.display_name}
            </span>
            <RoleBadge role={profile.role} />
            <form action={osSignOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-3 py-1.5 text-xs font-medium text-ink-900 transition-all hover:bg-sand-100"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        {/* Nav mobile — défilement horizontal */}
        <nav className="overflow-x-auto border-b border-taupe-300/30 bg-white px-3 py-2 lg:hidden">
          <ul className="flex gap-1 whitespace-nowrap">
            <NavLinksHorizontal items={nav} />
          </ul>
        </nav>

        {/* Titre mobile */}
        {title && (
          <div className="border-b border-taupe-300/20 bg-white px-5 py-3 lg:hidden">
            <h1 className="text-base font-medium text-ink-900">{title}</h1>
          </div>
        )}

        {/* Contenu */}
        <main className="flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  profile,
  nav,
}: {
  profile: Profile;
  nav: NavItem[];
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="border-b border-taupe-300/30 px-6 py-5">
        <Link href="/" className="block">
          <p className="text-xs uppercase tracking-[0.2em] text-taupe-500">
            Cabinet OS
          </p>
          <p className="mt-1 font-serif text-lg text-ink-900">
            Mise en Mouvement
          </p>
        </Link>
      </div>

      {/* Profil */}
      <div className="border-b border-taupe-300/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-taupe-700 text-xs font-medium text-sand-50">
            {getInitials(profile.display_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-900">
              {profile.display_name}
            </p>
            <RoleBadge role={profile.role} className="mt-0.5" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavLinks items={nav} />
      </nav>

      {/* Pied */}
      <div className="border-t border-taupe-300/30 px-3 py-4">
        <form action={osSignOut}>
          <button
            type="submit"
            className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-100 hover:text-ink-900"
          >
            ← Déconnexion
          </button>
        </form>
      </div>
    </div>
  );
}

function RoleBadge({
  role,
  className = "",
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide ${ROLE_COLORS[role]} ${className}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
