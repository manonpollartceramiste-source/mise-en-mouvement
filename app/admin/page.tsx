import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadSettings } from "@/lib/content/settings.server";
import { signOut } from "./login/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord admin",
  robots: { index: false, follow: false },
};

type Section = {
  id: string;
  label: string;
  description: string;
  href?: string;
};

const sections: Section[] = [
  {
    id: "parametres",
    label: "Paramètres généraux",
    description: "Identité, contact, réseaux, CTA, footer",
    href: "/admin/parametres",
  },
  {
    id: "offres",
    label: "Offres",
    description: "Tarifs, durées, descriptions",
    href: "/admin/offres",
  },
  {
    id: "coachs",
    label: "Coachs du site",
    description: "Photos, bios, liens Cal.com et SumUp affichés sur le site",
    href: "/admin/coachs",
  },
  {
    id: "faq",
    label: "FAQ",
    description: "Questions et réponses",
    href: "/admin/faq",
  },
  {
    id: "horaires",
    label: "Horaires",
    description: "Jours et plages d’ouverture",
    href: "/admin/horaires",
  },
  {
    id: "contenus",
    label: "Textes du site",
    description: "Hero, sections, CTA",
    href: "/admin/contenus",
  },
  {
    id: "images",
    label: "Images",
    description: "Logo, photos coachs",
    href: "/admin/images",
  },
  {
    id: "popups",
    label: "Pop-ups",
    description: "Annonces ponctuelles, offres de lancement",
    href: "/admin/popups",
  },
  {
    id: "avis",
    label: "Avis clients",
    description: "Témoignages, notes, ordre d'affichage",
    href: "/admin/avis",
  },
  {
    id: "clients",
    label: "Demandes clients",
    description: "Messages, demandes reçues et suivi des contacts",
    href: "/admin/clients",
  },
  {
    id: "mentions-legales",
    label: "Mentions légales",
    description: "Identité, hébergeur, confidentialité",
    href: "/admin/mentions-legales",
  },
  {
    id: "os-coachs",
    label: "Comptes coachs OS",
    description: "Créer les accès coachs et gérer leur connexion à /os/coach",
    href: "/os/coach",
  },
  {
    id: "os-clients",
    label: "Comptes clients OS",
    description: "Créer les clients, les rattacher à un coach et gérer leurs bilans",
    href: "/os/client",
  },
];

export default async function AdminDashboard() {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  const settings = await loadSettings();

  return (
    <main className="min-h-screen bg-sand-50">
      <header className="border-b border-taupe-300/30 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Espace admin
            </p>
            <h1 className="mt-1 font-serif text-2xl text-ink-900">
              {settings.companyName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-taupe-600 sm:inline">
              {user.email}
            </span>
            <Link
              href="/"
              className="text-sm text-taupe-600 transition-colors hover:text-ink-900"
            >
              Voir le site →
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-all duration-300 hover:bg-sand-100"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Sections
        </p>
        <h2 className="mt-3 font-serif text-3xl text-ink-900">
          Que souhaitez-vous modifier ?
        </h2>
        <p className="mt-3 max-w-xl text-sm text-taupe-600">
          Les éditeurs seront activés progressivement. Pour l’instant, l’espace
          admin est en place et la base Supabase est connectée.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) =>
            s.href ? (
              <Link
                key={s.id}
                href={s.href}
                className="group flex flex-col rounded-2xl border border-taupe-300/40 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-taupe-400/60 hover:shadow-[0_18px_40px_-24px_rgba(78,70,59,0.35)]"
              >
                <h3 className="font-serif text-xl text-ink-900">{s.label}</h3>
                <p className="mt-1 text-sm text-taupe-600">{s.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 self-start text-xs font-medium text-ink-900">
                  Modifier <span aria-hidden>→</span>
                </span>
              </Link>
            ) : (
              <article
                key={s.id}
                className="flex flex-col rounded-2xl border border-taupe-300/40 bg-white p-6"
              >
                <h3 className="font-serif text-xl text-ink-900">{s.label}</h3>
                <p className="mt-1 text-sm text-taupe-600">{s.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-sand-100 px-3 py-1 text-xs uppercase tracking-wider text-taupe-600">
                  Bientôt disponible
                </span>
              </article>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
