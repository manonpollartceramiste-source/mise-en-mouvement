import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/content/settings.server";
import { loadCoaches } from "@/lib/content/coaches.server";
import { loadTestimonials } from "@/lib/content/testimonials.server";
import { getMediaItems } from "@/lib/billing/server";
import { loadOffers } from "@/lib/content/offers.server";
import { loadClients } from "@/lib/content/clients.server";
import type { MediaItem } from "@/lib/billing/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord admin",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login?error=session");
  }

  const [settings, coaches, testimonials, medias, offers, clients] =
    await Promise.all([
      loadSettings(),
      loadCoaches(),
      loadTestimonials(),
      getMediaItems(true),
      loadOffers(),
      loadClients(),
    ]);

  const activeCoaches = coaches.filter((c) => c.active !== false).length;
  const publishedMedias = (medias as MediaItem[]).filter(
    (m) => m.status === "published"
  ).length;
  const recentMedias = [...(medias as MediaItem[])]
    .sort(
      (a, b) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
    )
    .slice(0, 5);
  const recentClients = [...clients]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 5);

  const kpis = [
    { label: "Coachs actifs", value: activeCoaches, icon: "👥" },
    { label: "Avis", value: testimonials.length, icon: "⭐" },
    { label: "Médias publiés", value: publishedMedias, icon: "🖼" },
    { label: "Offres", value: offers.length, icon: "🏷" },
    { label: "Demandes", value: clients.length, icon: "📨" },
  ];

  const quickActions = [
    {
      label: "Ajouter un média",
      description: "Uploader une photo ou vidéo",
      href: "/admin/medias",
      icon: "🖼",
    },
    {
      label: "Ajouter un coach",
      description: "Gérer les coachs du site",
      href: "/admin/coachs",
      icon: "👥",
    },
    {
      label: "Modifier les offres",
      description: "Tarifs, durées, descriptions",
      href: "/admin/offres",
      icon: "🏷",
    },
    {
      label: "Modifier les horaires",
      description: "Jours et plages d'ouverture",
      href: "/admin/parametres?tab=horaires",
      icon: "🕐",
    },
    {
      label: "Modifier les textes",
      description: "Hero, sections, CTA",
      href: "/admin/contenu?tab=textes",
      icon: "✏️",
    },
    {
      label: "Gérer les avis",
      description: "Témoignages et notes",
      href: "/admin/avis",
      icon: "⭐",
    },
    {
      label: "Voir les demandes",
      description: "Messages reçus via contact",
      href: "/admin/outils",
      icon: "📨",
    },
  ];

  return (
    <div className="min-h-full bg-sand-50">
      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">

        {/* Bannière de bienvenue */}
        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8">
          <p className="font-serif text-3xl text-ink-900">
            Bonjour 👋
          </p>
          <p className="mt-2 font-serif text-xl text-taupe-600">
            {settings.companyName}
          </p>
          <p className="mt-1 text-sm text-taupe-400">{user.email}</p>
        </div>

        {/* KPIs */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-taupe-500">Vue d'ensemble</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-2xl border border-taupe-300/40 bg-white p-5"
              >
                <span className="text-2xl">{kpi.icon}</span>
                <p className="mt-3 font-serif text-3xl text-ink-900">
                  {kpi.value}
                </p>
                <p className="mt-1 text-xs text-taupe-500">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions rapides */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-taupe-500">Actions rapides</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex flex-col rounded-2xl border border-taupe-300/40 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-taupe-400/60 hover:shadow-[0_12px_32px_-12px_rgba(78,70,59,0.25)]"
              >
                <span className="text-xl">{action.icon}</span>
                <p className="mt-3 text-sm font-medium text-ink-900">
                  {action.label}
                </p>
                <p className="mt-1 text-xs text-taupe-500">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <p className="mb-4 text-xs uppercase tracking-[0.2em] text-taupe-500">Activité récente</p>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Médias récents */}
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-lg text-ink-900">Médias récents</h2>
                <Link
                  href="/admin/medias"
                  className="text-xs text-taupe-500 hover:text-ink-900 transition-colors"
                >
                  Voir tout →
                </Link>
              </div>
              {recentMedias.length === 0 ? (
                <p className="text-sm text-taupe-400">Aucun média pour l'instant.</p>
              ) : (
                <ul className="space-y-3">
                  {recentMedias.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-900">
                          {m.title || "Sans titre"}
                        </p>
                        <p className="text-xs text-taupe-400">
                          {m.site_location ?? "—"}
                        </p>
                      </div>
                      {m.created_at && (
                        <span className="shrink-0 text-xs text-taupe-400">
                          {new Date(m.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Demandes récentes */}
            <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-lg text-ink-900">Demandes récentes</h2>
                <Link
                  href="/admin/outils?tab=clients"
                  className="text-xs text-taupe-500 hover:text-ink-900 transition-colors"
                >
                  Voir tout →
                </Link>
              </div>
              {recentClients.length === 0 ? (
                <p className="text-sm text-taupe-400">Aucune demande pour l'instant.</p>
              ) : (
                <ul className="space-y-3">
                  {recentClients.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-ink-900">{c.name}</p>
                        <p className="truncate text-xs text-taupe-400">{c.email}</p>
                      </div>
                      <span className="shrink-0 text-xs text-taupe-400">
                        {new Date(c.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
