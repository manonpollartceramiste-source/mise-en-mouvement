import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { OsShell } from "@/app/os/_components/OsShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bilan PDF",
  robots: { index: false, follow: false },
};

export default async function ClientBilanPage() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  return (
    <OsShell profile={profile} title="Bilan PDF">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink-900">Bilan PDF</h2>
      </div>

      <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
        <div className="mx-auto max-w-sm">
          <p className="font-serif text-3xl text-ink-900">Bilan PDF</p>
          <p className="mt-4 text-sm text-taupe-600">
            Votre bilan personnalisé — évolution, mesures, objectifs — sera
            disponible ici en téléchargement.
          </p>
          <span className="mt-6 inline-block rounded-full bg-sand-200 px-4 py-1.5 text-xs uppercase tracking-wider text-taupe-600">
            Disponible prochainement
          </span>
        </div>
      </div>
    </OsShell>
  );
}
