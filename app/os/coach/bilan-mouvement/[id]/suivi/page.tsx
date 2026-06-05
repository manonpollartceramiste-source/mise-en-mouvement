import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getOsProfileWithRole,
  getAssessmentById,
  getCoachClients,
  getAllActiveClients,
} from "@/lib/supabase/os-server";
import { OsShell } from "@/app/os/_components/OsShell";
import { BilanForm } from "../../nouveau/BilanForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Créer un suivi · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

export default async function SuiviBilanPage({ params }: { params: Params }) {
  const { id } = await params;

  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const source = await getAssessmentById(id);
  if (!source) notFound();

  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && source.coach_id !== profile.id) notFound();

  const clients = isAdmin
    ? await getAllActiveClients()
    : await getCoachClients(profile.id);

  return (
    <OsShell profile={profile} title="Créer un suivi">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-taupe-400">
          <Link
            href={`/os/coach/bilan-mouvement/${id}`}
            className="hover:text-taupe-600"
          >
            ← Retour au bilan précédent
          </Link>
        </div>
        <h2 className="mt-2 font-serif text-3xl text-ink-900">
          Créer un suivi
        </h2>
        <p className="mt-1 text-sm text-taupe-500">
          Les données du bilan précédent sont pré-remplies. Modifiez ce qui a changé, puis enregistrez.
        </p>
      </div>

      <BilanForm
        clients={clients}
        initialData={source}
        isSuivi
      />
    </OsShell>
  );
}
