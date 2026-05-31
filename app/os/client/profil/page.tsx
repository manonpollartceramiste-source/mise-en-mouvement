import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole, getProfileById } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import {
  OsField,
  OsSubmitButton,
  OsFlash,
} from "@/app/os/_components/OsFields";
import { updateProfileAction } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon profil",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function ClientProfilPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const { saved, error } = await searchParams;

  const supabase = await getSupabaseServer();
  const [coach, qRes] = await Promise.all([
    profile.coach_id ? getProfileById(profile.coach_id) : null,
    supabase
      .from("questionnaires")
      .select("id, status")
      .eq("client_id", profile.id)
      .maybeSingle(),
  ]);

  const questionnaire = qRes.data;

  return (
    <OsShell profile={profile} title="Mon profil">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink-900">Mon profil</h2>
      </div>

      <OsFlash saved={saved} error={error} />

      <div className="space-y-6 max-w-xl">
        {/* Infos modifiables */}
        <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
          <h3 className="mb-4 font-serif text-lg text-ink-900">
            Mes informations
          </h3>
          <form action={updateProfileAction} className="space-y-4">
            <OsField
              label="Nom affiché"
              name="display_name"
              defaultValue={profile.display_name}
              required
            />
            <OsField
              label="Téléphone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              placeholder="+33 6 00 00 00 00"
            />
            {/* Email en lecture seule */}
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-taupe-500">
                Email (non modifiable)
              </span>
              <p className="rounded-xl border border-taupe-300/30 bg-sand-100 px-3 py-2.5 text-sm text-taupe-500">
                {profile.email}
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <OsSubmitButton>Enregistrer →</OsSubmitButton>
            </div>
          </form>
        </div>

        {/* Coach */}
        {coach && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
            <h3 className="mb-3 font-serif text-lg text-ink-900">
              Mon coach
            </h3>
            <p className="font-medium text-ink-900">{coach.display_name}</p>
            {coach.email && (
              <p className="text-sm text-taupe-600">{coach.email}</p>
            )}
            {coach.bio && (
              <p className="mt-3 text-sm text-taupe-600">{coach.bio}</p>
            )}
          </div>
        )}

        {/* Questionnaire */}
        {questionnaire && (
          <div
            className={`rounded-2xl border p-5 ${
              questionnaire.status === "en_attente"
                ? "border-amber-300/60 bg-amber-50"
                : questionnaire.status === "relu"
                  ? "border-emerald-300/40 bg-emerald-50"
                  : "border-taupe-300/40 bg-sand-50"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-taupe-500">
              Questionnaire découverte
            </p>
            {questionnaire.status === "en_attente" && (
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm text-amber-800">
                  En attente de vos réponses
                </p>
                <Link
                  href="/os/client/questionnaire"
                  className="text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  Remplir →
                </Link>
              </div>
            )}
            {questionnaire.status === "soumis" && (
              <p className="mt-2 text-sm text-taupe-700">
                Envoyé · En attente de lecture par votre coach
              </p>
            )}
            {questionnaire.status === "relu" && (
              <p className="mt-2 text-sm text-emerald-800">
                Lu par votre coach ✓
              </p>
            )}
          </div>
        )}
      </div>
    </OsShell>
  );
}
