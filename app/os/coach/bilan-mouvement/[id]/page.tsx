import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  getOsProfileWithRole,
  getAssessmentById,
  getProfileById,
} from "@/lib/supabase/os-server";
import { OsShell } from "@/app/os/_components/OsShell";
import type { AssessmentTestEntry, MovementAssessment } from "@/lib/os/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bilan Mouvement · Coach",
  robots: { index: false, follow: false },
};

type Params = Promise<{ id: string }>;

const MOVEMENT_TESTS = [
  { key: "squat", label: "Squat" },
  { key: "equilibre", label: "Équilibre unipodal" },
  { key: "bras_au_dessus", label: "Bras au-dessus de la tête" },
  { key: "hip_hinge", label: "Hip hinge" },
];

const COMPOSITION_FIELDS: Array<{ key: keyof MovementAssessment; label: string; unit: string; dec: number }> = [
  { key: "weight_kg",     label: "Masse",                    unit: "kg",   dec: 1 },
  { key: "fat_pct",       label: "Masse grasse",             unit: "%",    dec: 1 },
  { key: "muscle_pct",    label: "Masse musculaire",         unit: "%",    dec: 1 },
  { key: "water_pct",     label: "Masse hydrique",           unit: "%",    dec: 1 },
  { key: "bone_mass_kg",  label: "Densité minérale osseuse", unit: "kg",   dec: 2 },
  { key: "visceral_fat",  label: "Graisse viscérale",        unit: "",     dec: 0 },
  { key: "bmr_kcal",      label: "Métabolisme basal",        unit: "kcal", dec: 0 },
  { key: "metabolic_age", label: "Âge métabolique",          unit: "ans",  dec: 0 },
];

const SEGMENTAL_FIELDS: Array<{ key: keyof MovementAssessment; label: string }> = [
  { key: "seg_arm_right_kg", label: "Bras droit" },
  { key: "seg_arm_left_kg",  label: "Bras gauche" },
  { key: "seg_leg_right_kg", label: "Jambe droite" },
  { key: "seg_leg_left_kg",  label: "Jambe gauche" },
  { key: "seg_trunk_kg",     label: "Tronc" },
];

const ZONE_LABELS: Record<string, string> = {
  cervicales:        "Ceinture cervicale",
  dos_haut:          "Ceinture scapulaire",
  epaules:           "Épaules",
  pectoraux:         "Pectoraux",
  grand_dorsal:      "Grand dorsal",
  lombaires:         "Lombaires",
  sangle_abdominale: "Sangle abdominale",
  bassin:            "Bassin",
  hanches:           "Hanches",
  fessiers:          "Fessiers",
  quadriceps:        "Quadriceps",
  ischio_jambiers:   "Ischio-jambiers",
  mollets:           "Mollets",
  chevilles:         "Chevilles",
  pieds:             "Pieds",
  genoux:            "Genoux",
};

const ZONE_CFG: Record<string, { bg: string; text: string }> = {
  forte:        { bg: "bg-red-50",    text: "text-red-700" },
  surveillance: { bg: "bg-amber-50",  text: "text-amber-700" },
  ras:          { bg: "bg-emerald-50",text: "text-emerald-700" },
};

const LIMITATIONS: Record<string, string> = {
  rester_assis: "Rester assis longtemps",
  monter_escaliers: "Monter les escaliers",
  porter_charges: "Porter des charges",
  se_pencher: "Se pencher en avant",
  fatigue_quotidienne: "Fatigue quotidienne",
  raideurs_reveil: "Raideurs au réveil",
  stress_corporel: "Stress corporel",
  manque_mobilite: "Manque de mobilité",
  douleurs_travail: "Douleurs liées au travail",
};

const RECOMMENDATIONS: Record<string, string> = {
  mobilite: "Mobilité",
  renforcement: "Renforcement",
  respiration: "Respiration",
  cardio: "Cardio",
  etirements: "Étirements",
  reequilibrage_postural: "Rééquilibrage postural",
  performance: "Performance",
  gestion_douleur: "Gestion douleur",
};

function ScoreBar({ value, max, label }: { value: number | null; max: number; label: string }) {
  const pct = value !== null ? (value / max) * 100 : 0;
  const barColor =
    pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-taupe-400";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        <span className="text-taupe-600">
          {value ?? "—"}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-sand-200">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ScoreDots({ value, max }: { value: number | null; max: number }) {
  if (value === null) return <span className="text-taupe-400">—</span>;
  const color =
    value <= 3 ? "bg-red-500" : value <= 6 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max + 1 }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full ${i <= value ? color : "bg-sand-200"}`}
        />
      ))}
      <span className="ml-1 text-sm font-semibold text-taupe-600">
        {value}/{max}
      </span>
    </div>
  );
}

function TestScoreBadge({ score }: { score: 0 | 1 | 2 }) {
  const cfg = {
    0: { label: "Douleur", cls: "border-red-300 bg-red-50 text-red-700" },
    1: { label: "Compensation", cls: "border-amber-300 bg-amber-50 text-amber-700" },
    2: { label: "Bon mouvement", cls: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  }[score];
  return (
    <span
      className={`inline-block rounded-lg border px-3 py-1 text-xs font-semibold ${cfg.cls}`}
    >
      {score} — {cfg.label}
    </span>
  );
}

export default async function BilanDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const assessment = await getAssessmentById(id);
  if (!assessment) notFound();

  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && assessment.coach_id !== profile.id) notFound();

  const clientProfile = await getProfileById(assessment.client_id);
  const clientName = clientProfile?.display_name ?? "Client";

  const date = new Date(assessment.assessed_at).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const total =
    (assessment.mobility_score ?? 0) +
    (assessment.stability_score ?? 0) +
    (assessment.strength_score ?? 0) +
    (assessment.posture_score ?? 0) +
    (assessment.coordination_score ?? 0);

  const hasScores =
    assessment.mobility_score !== null ||
    assessment.stability_score !== null ||
    assessment.strength_score !== null ||
    assessment.posture_score !== null ||
    assessment.coordination_score !== null;

  const activeRec = Object.entries(assessment.recommendations ?? {})
    .filter(([, v]) => v)
    .map(([k]) => RECOMMENDATIONS[k] ?? k);

  const activeLim = Object.entries(assessment.daily_limitations ?? {})
    .filter(([, v]) => v)
    .map(([k]) => LIMITATIONS[k] ?? k);

  const totalColor =
    total >= 80
      ? "text-emerald-600"
      : total >= 60
        ? "text-amber-600"
        : total >= 40
          ? "text-orange-500"
          : "text-red-500";

  return (
    <OsShell profile={profile} title="Bilan Mouvement">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-taupe-400">
            <Link href="/os/coach/bilan-mouvement" className="hover:text-taupe-600">
              ← Tous les bilans
            </Link>
          </div>
          <h2 className="mt-2 font-serif text-3xl text-ink-900">{clientName}</h2>
          <p className="mt-1 text-sm capitalize text-taupe-500">{date}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/os/coach/bilan-mouvement/${assessment.id}/rapport`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-taupe-300/60 bg-white px-4 py-2 text-sm font-medium text-taupe-600 transition-colors hover:bg-sand-100"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5 1a2 2 0 0 0-2 2v1H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2H5zm6 0v3H5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1zm-6 9h6v3a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-3z"/>
            </svg>
            Rapport PDF
          </Link>
          <Link
            href={`/os/coach/bilan-mouvement/nouveau?client=${assessment.client_id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-taupe-300/60 px-4 py-2 text-sm font-medium text-taupe-600 transition-colors hover:bg-sand-100"
          >
            + Nouveau bilan
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── Score hero ── */}
        {hasScores && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="col-span-full rounded-2xl bg-ink-900 p-6 text-sand-50 lg:col-span-1">
              <p className="text-xs uppercase tracking-wider text-sand-400">
                Score global
              </p>
              <p className={`mt-2 text-6xl font-bold ${totalColor}`}>{total}</p>
              <p className="text-lg text-sand-400">/100</p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-700">
                <div
                  className={`h-full rounded-full ${total >= 80 ? "bg-emerald-400" : total >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${total}%` }}
                />
              </div>
            </div>

            <div className="sm:col-span-1 lg:col-span-2 rounded-2xl border border-taupe-300/40 bg-white p-5">
              <p className="mb-4 text-sm font-medium text-taupe-500">
                Scores détaillés
              </p>
              <div className="space-y-3">
                <ScoreBar label="Mobilité" value={assessment.mobility_score} max={20} />
                <ScoreBar label="Stabilité" value={assessment.stability_score} max={20} />
                <ScoreBar label="Force" value={assessment.strength_score} max={20} />
                <ScoreBar label="Posture" value={assessment.posture_score} max={20} />
                <ScoreBar label="Coordination" value={assessment.coordination_score} max={20} />
              </div>
            </div>
          </div>
        )}

        {/* ── Bilan subjectif ── */}
        {(assessment.energy_score !== null ||
          assessment.stress_score !== null ||
          assessment.sleep_score !== null ||
          assessment.pain_score !== null) && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Bilan subjectif
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Énergie", value: assessment.energy_score },
                { label: "Stress", value: assessment.stress_score },
                { label: "Sommeil", value: assessment.sleep_score },
                { label: "Douleur", value: assessment.pain_score },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="mb-2 text-xs text-taupe-500">{label}</p>
                  <ScoreDots value={value} max={10} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Mode de vie ── */}
        {(assessment.main_goal ||
          assessment.concrete_goal ||
          assessment.work_type ||
          assessment.sport_practiced ||
          assessment.old_injuries ||
          assessment.pain_zones) && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Mode de vie
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: "Objectif principal", value: assessment.main_goal },
                { label: "Objectif mesurable", value: assessment.concrete_goal },
                { label: "Blessures anciennes", value: assessment.old_injuries },
                { label: "Opérations", value: assessment.operations },
                { label: "Sport pratiqué", value: assessment.sport_practiced },
                { label: "Niveau d'activité", value: assessment.activity_level },
                { label: "Zones de douleur", value: assessment.pain_zones },
              ]
                .filter(({ value }) => value)
                .map(({ label, value }) => (
                  <div key={label}>
                    <p className="mb-1 text-xs font-medium text-taupe-500">
                      {label}
                    </p>
                    <p className="text-sm text-ink-900">{value}</p>
                  </div>
                ))}
              {assessment.work_type && (
                <div>
                  <p className="mb-1 text-xs font-medium text-taupe-500">
                    Type de travail
                  </p>
                  <span className="inline-block rounded-full bg-sand-200 px-3 py-1 text-xs font-medium capitalize text-taupe-700">
                    {assessment.work_type}
                  </span>
                </div>
              )}
              {assessment.sitting_hours_per_day !== null && (
                <div>
                  <p className="mb-1 text-xs font-medium text-taupe-500">
                    Temps assis
                  </p>
                  <p className="text-sm text-ink-900">
                    {assessment.sitting_hours_per_day}h/jour
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tests de mouvement ── */}
        {assessment.movement_tests && (
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Tests de mouvement
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {MOVEMENT_TESTS.map((t) => {
                const entry = (assessment.movement_tests as Record<string, AssessmentTestEntry>)[t.key];
                if (!entry) return null;
                return (
                  <div
                    key={t.key}
                    className="rounded-2xl border border-taupe-300/40 bg-white p-4"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="font-medium text-ink-900">{t.label}</p>
                      {entry.score10 !== null && entry.score10 !== undefined && (
                        <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-xs font-bold text-taupe-600">
                          {entry.score10}/10
                        </span>
                      )}
                    </div>
                    <TestScoreBadge score={entry.score} />
                    {entry.zone && (
                      <p className="mt-2 text-xs text-taupe-500">
                        <span className="font-medium">Zone : </span>
                        {entry.zone}
                      </p>
                    )}
                    {entry.observation && (
                      <p className="mt-1 text-xs text-taupe-600">
                        <span className="font-medium">Observation : </span>
                        {entry.observation}
                      </p>
                    )}
                    {entry.note && (
                      <p className="mt-1 text-xs text-taupe-500">
                        <span className="font-medium">Note coach : </span>
                        {entry.note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Composition corporelle ── */}
        {(COMPOSITION_FIELDS.some(f => (assessment[f.key] as number | null) !== null) ||
          SEGMENTAL_FIELDS.some(f => (assessment[f.key] as number | null) !== null)) && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Composition corporelle
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {COMPOSITION_FIELDS.map(({ key, label, unit, dec }) => {
                const raw = assessment[key] as number | null;
                if (raw === null || raw === undefined) return null;
                const val = dec > 0 ? raw.toFixed(dec) : String(Math.round(raw));
                return (
                  <div key={key}>
                    <p className="mb-0.5 text-xs text-taupe-500">{label}</p>
                    <p className="text-lg font-bold text-ink-900">
                      {val}{unit && <span className="ml-1 text-sm font-normal text-taupe-400">{unit}</span>}
                    </p>
                  </div>
                );
              })}
            </div>
            {SEGMENTAL_FIELDS.some(f => (assessment[f.key] as number | null) !== null) && (
              <div className="mt-4 border-t border-taupe-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-taupe-400">
                  Masse musculaire segmentaire
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {SEGMENTAL_FIELDS.map(({ key, label }) => {
                    const raw = assessment[key] as number | null;
                    if (raw === null || raw === undefined) return null;
                    return (
                      <div key={key}>
                        <p className="mb-0.5 text-xs text-taupe-500">{label}</p>
                        <p className="text-lg font-bold text-ink-900">
                          {raw.toFixed(2)}
                          <span className="ml-1 text-sm font-normal text-taupe-400">kg</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Zones prioritaires ── */}
        {assessment.zone_priorities && Object.keys(assessment.zone_priorities).length > 0 && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Zones prioritaires
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(assessment.zone_priorities as Record<string, "forte" | "surveillance" | "ras">).map(([key, priority]) => {
                const cfg = ZONE_CFG[priority] ?? { bg: "bg-sand-100", text: "text-taupe-600" };
                const priorityLabel = priority === "forte" ? "Priorité" : priority === "surveillance" ? "Surveillance" : "RAS";
                return (
                  <span
                    key={key}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
                  >
                    {ZONE_LABELS[key] ?? key} · {priorityLabel}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Limitations & Recommandations ── */}
        {(activeLim.length > 0 || activeRec.length > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeLim.length > 0 && (
              <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-taupe-400">
                  Limitations
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeLim.map((l) => (
                    <span
                      key={l}
                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {activeRec.length > 0 && (
              <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
                <p className="mb-3 text-sm font-medium uppercase tracking-wider text-taupe-400">
                  Recommandations
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeRec.map((r) => (
                    <span
                      key={r}
                      className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Programme ── */}
        {(assessment.frequency || assessment.motivation || assessment.engagement) && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Programme recommandé
            </p>
            <div className="flex flex-wrap gap-4">
              {assessment.frequency && (
                <div>
                  <p className="mb-1 text-xs text-taupe-500">Fréquence</p>
                  <span className="rounded-full bg-ink-900 px-3 py-1 text-xs font-medium text-sand-50">
                    {assessment.frequency}
                  </span>
                </div>
              )}
              {assessment.motivation && (
                <div>
                  <p className="mb-1 text-xs text-taupe-500">Motivation</p>
                  <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-medium capitalize text-taupe-700">
                    {assessment.motivation}
                  </span>
                </div>
              )}
              {assessment.engagement && (
                <div>
                  <p className="mb-1 text-xs text-taupe-500">Engagement</p>
                  <span className="rounded-full bg-sand-200 px-3 py-1 text-xs font-medium capitalize text-taupe-700">
                    {assessment.engagement}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Observations par axe ── */}
        {assessment.axis_notes && Object.keys(assessment.axis_notes as Record<string, string>).length > 0 && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Observations par axe
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  { key: "mobilite",     label: "Mobilité" },
                  { key: "stabilite",    label: "Stabilité" },
                  { key: "force",        label: "Force" },
                  { key: "posture",      label: "Posture" },
                  { key: "coordination", label: "Coordination" },
                ] as const
              ).map(({ key, label }) => {
                const note = (assessment.axis_notes as Record<string, string>)[key];
                if (!note) return null;
                return (
                  <div key={key}>
                    <p className="mb-1 text-xs font-medium text-taupe-500">{label}</p>
                    <p className="whitespace-pre-line text-sm text-ink-900">{note}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Notes & suite ── */}
        {(assessment.important_notes ||
          assessment.next_action ||
          assessment.pain_evolution) && (
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
            <p className="mb-4 text-sm font-medium uppercase tracking-wider text-taupe-400">
              Notes & suite
            </p>
            <div className="space-y-3">
              {assessment.important_notes && (
                <div>
                  <p className="mb-1 text-xs font-medium text-taupe-500">
                    Notes importantes
                  </p>
                  <p className="whitespace-pre-line text-sm text-ink-900">
                    {assessment.important_notes}
                  </p>
                </div>
              )}
              {assessment.next_action && (
                <div>
                  <p className="mb-1 text-xs font-medium text-taupe-500">
                    Prochaine action
                  </p>
                  <p className="whitespace-pre-line text-sm text-ink-900">
                    {assessment.next_action}
                  </p>
                </div>
              )}
              {assessment.pain_evolution && (
                <div>
                  <p className="mb-1 text-xs font-medium text-taupe-500">
                    Évolution douleur
                  </p>
                  <p className="whitespace-pre-line text-sm text-ink-900">
                    {assessment.pain_evolution}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OsShell>
  );
}
