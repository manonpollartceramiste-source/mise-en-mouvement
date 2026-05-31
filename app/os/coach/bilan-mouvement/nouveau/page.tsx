import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getCoachClients,
  getAllActiveClients,
} from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BilanForm } from "./BilanForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Nouveau bilan · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ client?: string }>;

export default async function NouveauBilanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { client: preselectedClient } = await searchParams;
  const isAdmin = profile.roles.includes("admin");

  // Log pour diagnostic
  console.log("[bilan-mouvement/nouveau] profile.id:", profile.id, "isAdmin:", isAdmin);

  let clients = isAdmin
    ? await getAllActiveClients()
    : await getCoachClients(profile.id);

  console.log("[bilan-mouvement/nouveau] clients count:", clients.length);

  // Si coach sans clients assignés, tenter un fallback sur tous les clients actifs
  // (cas fréquent en dev/test : coach_id pas encore renseigné sur les profils clients)
  if (!isAdmin && clients.length === 0) {
    console.log("[bilan-mouvement/nouveau] fallback: requête tous clients actifs pour le coach");
    const supabase = await getSupabaseServer();
    const { data: fallback, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .eq("active", true)
      .order("display_name");
    console.log("[bilan-mouvement/nouveau] fallback result:", fallback?.length ?? 0, error?.message);
    clients = (fallback ?? []) as typeof clients;
  }

  // Pas de clients du tout — afficher un message, jamais rediriger silencieusement
  if (clients.length === 0) {
    return (
      <OsShell profile={profile} title="Nouveau bilan mouvement">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
            Cabinet OS
          </p>
          <h2 className="mt-1 font-serif text-3xl text-ink-900">
            Nouveau bilan mouvement
          </h2>
        </div>

        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
          <p className="font-serif text-2xl text-ink-900">Aucun client disponible</p>
          <p className="mt-3 text-sm text-taupe-500">
            Ajoutez des clients depuis l&apos;espace admin avant de créer un bilan.
            <br />
            Si des clients existent, vérifiez que leur{" "}
            <code className="rounded bg-sand-200 px-1 py-0.5 text-xs">coach_id</code> est
            bien renseigné dans la table{" "}
            <code className="rounded bg-sand-200 px-1 py-0.5 text-xs">profiles</code>.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href="/os/coach/bilan-mouvement"
              className="rounded-xl border border-taupe-300/60 px-5 py-2.5 text-sm font-medium text-taupe-600 transition-colors hover:bg-sand-100"
            >
              ← Retour aux bilans
            </Link>
            <Link
              href="/os/coach/clients"
              className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
            >
              Voir mes clients
            </Link>
          </div>
        </div>
      </OsShell>
    );
  }

  return (
    <OsShell profile={profile} title="Nouveau bilan mouvement">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Nouveau bilan mouvement
        </h2>
        <p className="mt-1 text-sm text-taupe-500">
          Remplissez le bilan pendant ou après la séance.{" "}
          <span className="text-taupe-400">
            ({clients.length} client{clients.length !== 1 ? "s" : ""} disponible
            {clients.length !== 1 ? "s" : ""})
          </span>
        </p>
      </div>

      <BilanForm clients={clients} preselectedClientId={preselectedClient} />
    </OsShell>
  );
}
