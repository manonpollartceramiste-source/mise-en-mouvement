import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import {
  OsField,
  OsTextarea,
  OsSelect,
  OsSubmitButton,
  OsFlash,
} from "@/app/os/_components/OsFields";
import type { Questionnaire } from "@/lib/os/types";
import { submitQuestionnaireAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Questionnaire découverte",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

const STRESS_OPTIONS = [
  { value: "", label: "— Sélectionner —" },
  { value: "1", label: "1 — Très faible" },
  { value: "2", label: "2 — Faible" },
  { value: "3", label: "3 — Modéré" },
  { value: "4", label: "4 — Élevé" },
  { value: "5", label: "5 — Très élevé" },
];

export default async function ClientQuestionnairePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const { saved, error } = await searchParams;

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("questionnaires")
    .select("*")
    .eq("client_id", profile.id)
    .maybeSingle();

  const questionnaire = data as Questionnaire | null;

  return (
    <OsShell profile={profile} title="Questionnaire découverte">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink-900">
          Questionnaire découverte
        </h2>
        <p className="mt-2 text-sm text-taupe-600">
          Ces informations aident votre coach à personnaliser votre
          accompagnement.
        </p>
      </div>

      <OsFlash saved={saved} error={error} />

      {/* Pas de questionnaire créé */}
      {!questionnaire && (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-12 text-center">
          <p className="font-serif text-xl text-ink-900">
            Questionnaire non disponible
          </p>
          <p className="mt-2 text-sm text-taupe-600">
            Votre coach vous enverra un questionnaire prochainement.
          </p>
        </div>
      )}

      {/* Déjà soumis ou relu — lecture seule */}
      {questionnaire &&
        (questionnaire.status === "soumis" ||
          questionnaire.status === "relu") && (
          <div className="space-y-6 max-w-2xl">
            <div
              className={`rounded-2xl border px-5 py-4 ${
                questionnaire.status === "relu"
                  ? "border-emerald-300/40 bg-emerald-50"
                  : "border-taupe-300/40 bg-sand-50"
              }`}
            >
              {questionnaire.status === "soumis" ? (
                <p className="text-sm text-taupe-700">
                  Questionnaire envoyé — en attente de lecture par votre
                  coach.
                </p>
              ) : (
                <p className="text-sm text-emerald-800">
                  Questionnaire lu par votre coach ✓
                </p>
              )}
              {questionnaire.coach_comment && (
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wider text-taupe-500">
                    Commentaire de votre coach
                  </p>
                  <p className="mt-1 text-sm text-ink-900">
                    {questionnaire.coach_comment}
                  </p>
                </div>
              )}
            </div>

            {/* Affichage des réponses */}
            {questionnaire.answers && (
              <div className="rounded-2xl border border-taupe-300/40 bg-white divide-y divide-taupe-300/20">
                <div className="px-5 py-3">
                  <p className="text-xs uppercase tracking-wider text-taupe-500 mb-2">
                    Vos réponses
                  </p>
                </div>
                {[
                  { label: "Objectif principal", value: questionnaire.answers.main_goal },
                  { label: "Motivation", value: questionnaire.answers.motivation },
                  { label: "Activité actuelle", value: questionnaire.answers.current_activity },
                  { label: "Disponibilités", value: questionnaire.answers.availability },
                  { label: "Informations complémentaires", value: questionnaire.answers.additional_info },
                ]
                  .filter((r) => r.value)
                  .map((r) => (
                    <div key={r.label} className="px-5 py-3">
                      <p className="text-xs uppercase tracking-wider text-taupe-500">
                        {r.label}
                      </p>
                      <p className="mt-1 text-sm text-ink-900">{r.value}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

      {/* Formulaire — en attente */}
      {questionnaire && questionnaire.status === "en_attente" && (
        <form
          action={submitQuestionnaireAction}
          className="max-w-2xl space-y-8"
        >
          <input
            type="hidden"
            name="questionnaire_id"
            value={questionnaire.id}
          />

          {/* Objectifs */}
          <Section title="Vos objectifs">
            <OsTextarea
              label="Objectif principal"
              name="main_goal"
              rows={2}
              placeholder="Ex : Perdre du poids, améliorer ma mobilité…"
              required
            />
            <OsField
              label="Objectifs secondaires (séparés par une virgule)"
              name="secondary_goals"
              placeholder="Ex : Réduire le stress, mieux dormir"
            />
            <OsTextarea
              label="Qu'est-ce qui vous motive ?"
              name="motivation"
              rows={2}
            />
          </Section>

          {/* Santé */}
          <Section title="Santé & historique">
            <OsTextarea
              label="Antécédents médicaux"
              name="medical_history"
              rows={2}
              placeholder="Maladies chroniques, opérations…"
            />
            <OsTextarea
              label="Blessures en cours ou récentes"
              name="injuries"
              rows={2}
            />
            <OsField
              label="Médicaments en cours"
              name="medications"
              placeholder="Aucun si non concerné"
            />
          </Section>

          {/* Habitudes */}
          <Section title="Habitudes de vie">
            <OsTextarea
              label="Activité physique actuelle"
              name="current_activity"
              rows={2}
              placeholder="Sport pratiqué, fréquence, intensité…"
            />
            <OsField
              label="Fréquence d&apos;entraînement souhaitée"
              name="activity_frequency"
              placeholder="Ex : 3 fois par semaine"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <OsField
                label="Heures de sommeil par nuit"
                name="sleep_hours"
                type="number"
                min="1"
                max="12"
                step="0.5"
                placeholder="7"
              />
              <OsSelect
                label="Niveau de stress quotidien"
                name="stress_level"
                options={STRESS_OPTIONS}
              />
            </div>
          </Section>

          {/* Alimentation */}
          <Section title="Alimentation">
            <OsTextarea
              label="Description de votre alimentation"
              name="diet_description"
              rows={2}
              placeholder="Régimes particuliers, habitudes…"
            />
            <OsField
              label="Restrictions ou allergies alimentaires"
              name="dietary_restrictions"
              placeholder="Aucune si non concerné"
            />
          </Section>

          {/* Disponibilités */}
          <Section title="Disponibilités">
            <OsTextarea
              label="Vos disponibilités générales"
              name="availability"
              rows={2}
              placeholder="Ex : Semaine le soir après 18h, week-ends le matin"
            />
            <OsField
              label="Créneaux préférés"
              name="preferred_schedule"
              placeholder="Ex : Mardi et jeudi 19h"
            />
          </Section>

          {/* Infos complémentaires */}
          <Section title="Informations complémentaires">
            <OsTextarea
              label="Tout ce que vous souhaitez partager avec votre coach"
              name="additional_info"
              rows={3}
            />
          </Section>

          <div className="flex justify-end">
            <OsSubmitButton>Envoyer le questionnaire →</OsSubmitButton>
          </div>
        </form>
      )}
    </OsShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-taupe-300/40 bg-white p-6 space-y-4">
      <h3 className="font-serif text-lg text-ink-900">{title}</h3>
      {children}
    </div>
  );
}
