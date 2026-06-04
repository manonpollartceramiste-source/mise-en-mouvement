"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import type { Profile, AssessmentTestEntry } from "@/lib/os/types";
import { createAssessmentAction } from "../actions";

// ─── Types locaux ────────────────────────────────────────────

type Tests = Record<string, AssessmentTestEntry>;
type BoolMap = Record<string, boolean>;

type FormState = {
  client_id: string;
  assessed_at: string;
  sexe: "femme" | "homme" | null;
  age: number | null;
  energy_score: number | null;
  stress_score: number | null;
  sleep_score: number | null;
  pain_score: number | null;
  weight_kg: number | null;
  fat_pct: number | null;
  muscle_pct: number | null;
  water_pct: number | null;
  bone_mass_kg: number | null;
  visceral_fat: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  seg_arm_right_kg: number | null;
  seg_arm_left_kg: number | null;
  seg_leg_right_kg: number | null;
  seg_leg_left_kg: number | null;
  seg_trunk_kg: number | null;
  main_goal: string;
  concrete_goal: string;
  old_injuries: string;
  operations: string;
  work_type: "assis" | "debout" | "physique" | "mixte" | null;
  sport_practiced: string;
  activity_level: string;
  sitting_hours_per_day: number | null;
  pain_zones: string;
  mobility_score: number | null;
  stability_score: number | null;
  strength_score: number | null;
  posture_score: number | null;
  coordination_score: number | null;
  movement_tests: Tests;
  daily_limitations: BoolMap;
  recommendations: BoolMap;
  zone_priorities: ZonePriorityMap;
  axis_notes: Record<string, string>;
  frequency: "1x/semaine" | "2x/semaine" | "3x/semaine" | "4x/semaine" | "5x/semaine" | null;
  engagement:
    | "J'ai besoin d'être guidé(e) pour démarrer"
    | "Je suis prêt(e) à progresser régulièrement"
    | "Je suis pleinement engagé(e) dans ma transformation"
    | null;
  important_notes: string;
  next_action: string;
  pain_evolution: string;
};

// ─── Constantes ──────────────────────────────────────────────

const MOVEMENT_TESTS = [
  { key: "squat", label: "Squat", desc: "Pieds largeur épaules, descend jusqu'aux cuisses parallèles" },
  { key: "equilibre", label: "Équilibre unipodal", desc: "Tenu 10 s sur une jambe, yeux ouverts" },
  { key: "bras_au_dessus", label: "Bras au-dessus de la tête", desc: "Bras tendus verticaux, dos droit, sans cambrure" },
  { key: "hip_hinge", label: "Hip hinge", desc: "Charnière hanches, dos neutre, flexion avant contrôlée" },
] as const;

const TEST_SCORES: { value: 0 | 1 | 2; label: string; sublabel: string; active: string; inactive: string }[] = [
  {
    value: 0,
    label: "Douleur",
    sublabel: "Score 0",
    active: "bg-red-500 border-red-500 text-white shadow-md shadow-red-200",
    inactive: "bg-white border-taupe-200 text-taupe-500 hover:bg-red-50 hover:border-red-200",
  },
  {
    value: 1,
    label: "Compensation",
    sublabel: "Score 1",
    active: "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200",
    inactive: "bg-white border-taupe-200 text-taupe-500 hover:bg-amber-50 hover:border-amber-200",
  },
  {
    value: 2,
    label: "Bon mouvement",
    sublabel: "Score 2",
    active: "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200",
    inactive: "bg-white border-taupe-200 text-taupe-500 hover:bg-emerald-50 hover:border-emerald-200",
  },
];

const LIMITATIONS = [
  { key: "rester_assis", label: "Rester assis longtemps" },
  { key: "monter_escaliers", label: "Monter les escaliers" },
  { key: "porter_charges", label: "Porter des charges" },
  { key: "se_pencher", label: "Se pencher en avant" },
  { key: "fatigue_quotidienne", label: "Fatigue quotidienne" },
  { key: "raideurs_reveil", label: "Raideurs au réveil" },
  { key: "stress_corporel", label: "Stress corporel" },
  { key: "manque_mobilite", label: "Manque de mobilité" },
  { key: "douleurs_travail", label: "Douleurs liées au travail" },
];

const RECOMMENDATIONS = [
  { key: "mobilite", label: "Mobilité" },
  { key: "renforcement", label: "Renforcement" },
  { key: "respiration", label: "Respiration" },
  { key: "cardio", label: "Cardio" },
  { key: "etirements", label: "Étirements" },
  { key: "reequilibrage_postural", label: "Rééquilibrage postural" },
  { key: "performance", label: "Performance" },
  { key: "gestion_douleur", label: "Gestion douleur" },
];

type ZonePriority = "forte" | "surveillance" | "ras";
type ZonePriorityMap = Record<string, ZonePriority>;

const BODY_ZONES = [
  { key: "cervicales",        label: "Ceinture cervicale" },
  { key: "dos_haut",          label: "Ceinture scapulaire" },
  { key: "epaules",           label: "Épaules" },
  { key: "pectoraux",         label: "Pectoraux" },
  { key: "grand_dorsal",      label: "Grand dorsal" },
  { key: "lombaires",         label: "Lombaires" },
  { key: "sangle_abdominale", label: "Sangle abdominale" },
  { key: "bassin",            label: "Bassin" },
  { key: "hanches",           label: "Hanches" },
  { key: "fessiers",          label: "Fessiers" },
  { key: "quadriceps",        label: "Quadriceps" },
  { key: "ischio_jambiers",   label: "Ischio-jambiers" },
  { key: "genoux",            label: "Genoux" },
  { key: "mollets",           label: "Mollets" },
  { key: "chevilles",         label: "Chevilles" },
  { key: "pieds",             label: "Pieds" },
] as const;

const ZONE_PRIORITIES: { value: ZonePriority; label: string; active: string; inactive: string }[] = [
  {
    value: "forte",
    label: "Priorité",
    active: "bg-red-500/90 border-red-500 text-white",
    inactive: "border-taupe-200 bg-white text-taupe-500 hover:bg-red-50 hover:border-red-300",
  },
  {
    value: "surveillance",
    label: "Surveillance",
    active: "bg-amber-500/90 border-amber-500 text-white",
    inactive: "border-taupe-200 bg-white text-taupe-500 hover:bg-amber-50 hover:border-amber-300",
  },
  {
    value: "ras",
    label: "RAS",
    active: "bg-emerald-500/90 border-emerald-500 text-white",
    inactive: "border-taupe-200 bg-white text-taupe-500 hover:bg-emerald-50 hover:border-emerald-300",
  },
];

type CompositionFieldKey = "weight_kg" | "fat_pct" | "muscle_pct" | "water_pct" | "bone_mass_kg" | "visceral_fat" | "bmr_kcal" | "metabolic_age";

const COMPOSITION_FIELDS: Array<{
  key: CompositionFieldKey;
  label: string;
  unit: string;
  step: string;
  placeholder: string;
}> = [
  { key: "weight_kg",     label: "Masse",                    unit: "kg",   step: "0.1",  placeholder: "72,5" },
  { key: "fat_pct",       label: "Masse grasse",             unit: "%",    step: "0.1",  placeholder: "18,5" },
  { key: "muscle_pct",    label: "Masse musculaire",         unit: "%",    step: "0.1",  placeholder: "42,0" },
  { key: "water_pct",     label: "Masse hydrique",           unit: "%",    step: "0.1",  placeholder: "58,0" },
  { key: "bone_mass_kg",  label: "Densité minérale osseuse", unit: "kg",   step: "0.01", placeholder: "3,20" },
  { key: "visceral_fat",  label: "Graisse viscérale",        unit: "",     step: "0.1",  placeholder: "8" },
  { key: "bmr_kcal",      label: "Métabolisme basal",        unit: "kcal", step: "1",    placeholder: "1650" },
  { key: "metabolic_age", label: "Âge métabolique",          unit: "ans",  step: "1",    placeholder: "35" },
];

type SegmentalFieldKey = "seg_arm_right_kg" | "seg_arm_left_kg" | "seg_leg_right_kg" | "seg_leg_left_kg" | "seg_trunk_kg";

const SEGMENTAL_FIELDS: Array<{ key: SegmentalFieldKey; label: string }> = [
  { key: "seg_arm_right_kg", label: "Bras droit" },
  { key: "seg_arm_left_kg",  label: "Bras gauche" },
  { key: "seg_leg_right_kg", label: "Jambe droite" },
  { key: "seg_leg_left_kg",  label: "Jambe gauche" },
  { key: "seg_trunk_kg",     label: "Tronc" },
];

const AXES = [
  {
    key:     "mobility_score"     as const,
    noteKey: "mobilite",
    label:   "Mobilité",
    desc:    "Amplitude articulaire, souplesse, qualité du mouvement global",
  },
  {
    key:     "stability_score"    as const,
    noteKey: "stabilite",
    label:   "Stabilité",
    desc:    "Gainage, contrôle moteur, équilibre statique et dynamique",
  },
  {
    key:     "strength_score"     as const,
    noteKey: "force",
    label:   "Force",
    desc:    "Force musculaire fonctionnelle, capacité de résistance à l'effort",
  },
  {
    key:     "posture_score"      as const,
    noteKey: "posture",
    label:   "Posture",
    desc:    "Alignement corporel, position neutre, gestion des compensations",
  },
  {
    key:     "coordination_score" as const,
    noteKey: "coordination",
    label:   "Coordination",
    desc:    "Qualité de pattern moteur, timing, enchaînement des mouvements",
  },
] as const;

const SECTIONS = [
  { id: "subjectif",        label: "Subjectif" },
  { id: "composition",      label: "Compo." },
  { id: "tests",            label: "Tests" },
  { id: "mode-vie",         label: "Mode de vie" },
  { id: "zones",            label: "Zones" },
  { id: "scores",           label: "Synthèse" },
  { id: "limitations",      label: "Limitations" },
  { id: "recommandations",  label: "Reco." },
  { id: "programme",        label: "Programme" },
  { id: "notes",            label: "Notes" },
];

// ─── Score helpers ────────────────────────────────────────────

function scoreColor(s: number): string {
  if (s >= 80) return "text-emerald-600";
  if (s >= 60) return "text-amber-600";
  if (s >= 40) return "text-orange-500";
  return "text-red-500";
}

function scoreStroke(s: number): string {
  if (s >= 80) return "#10b981";
  if (s >= 60) return "#f59e0b";
  if (s >= 40) return "#f97316";
  return "#ef4444";
}

function scoreLabel(s: number): string {
  if (s >= 80) return "Excellent";
  if (s >= 60) return "Bon";
  if (s >= 40) return "Moyen";
  return "À travailler";
}

// ─── ScoreGauge ───────────────────────────────────────────────

function ScoreGauge({ score, size = 96 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="#e8e4df" strokeWidth="6"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={scoreStroke(score)}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1), stroke 0.4s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className={`text-xl font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
        <span className="text-[10px] text-taupe-400 mt-0.5">/100</span>
      </div>
    </div>
  );
}

// ─── PremiumScoreRow (0–10 round buttons) ────────────────────

function PremiumScoreRow({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
  description?: string;
}) {
  const buttons = Array.from({ length: 11 }, (_, i) => i);

  function buttonCls(i: number) {
    if (value !== i) {
      return "border border-taupe-200 bg-white text-taupe-400 hover:border-taupe-400 hover:text-ink-900 transition-all";
    }
    if (i <= 3) return "bg-red-500 border-red-500 text-white shadow-sm shadow-red-200 scale-110 transition-all";
    if (i <= 6) return "bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200 scale-110 transition-all";
    return "bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200 scale-110 transition-all";
  }

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-base font-semibold text-ink-900">{label}</span>
        <div className="flex items-baseline gap-2">
          {description && <span className="text-xs text-taupe-400">{description}</span>}
          {value !== null && (
            <span className={`text-base font-bold ${scoreColor(value * 10)}`}>
              {value}/10
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-medium ${buttonCls(i)}`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── PremiumStepper (/20, large touch targets) ───────────────

function PremiumStepper({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  max: number;
}) {
  const current = value ?? 0;
  const pct = (current / max) * 100;
  const barColor = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct >= 25 ? "bg-orange-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-4">
      <span className="w-28 shrink-0 text-sm font-semibold text-ink-900">{label}</span>

      <button
        type="button"
        onClick={() => onChange(Math.max(0, current - 1))}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-taupe-200 bg-white text-xl text-taupe-600 transition-all hover:border-taupe-400 hover:bg-sand-100 active:scale-95"
      >
        −
      </button>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-full overflow-hidden rounded-full bg-sand-200">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-taupe-400">0</span>
          <span className={`text-sm font-bold ${scoreColor(pct)}`}>
            {current}/{max}
          </span>
          <span className="text-xs text-taupe-400">{max}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, current + 1))}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-taupe-200 bg-white text-xl text-taupe-600 transition-all hover:border-taupe-400 hover:bg-sand-100 active:scale-95"
      >
        +
      </button>
    </div>
  );
}

// ─── ChipGrid (limitations & recommandations) ────────────────

function ChipGrid({
  items,
  values,
  onChange,
}: {
  items: { key: string; label: string }[];
  values: BoolMap;
  onChange: (key: string, v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {items.map((item) => {
        const active = !!values[item.key];
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key, !active)}
            className={`flex h-11 items-center gap-1.5 rounded-full border px-5 text-sm font-medium transition-all active:scale-95 ${
              active
                ? "border-ink-900 bg-ink-900 text-sand-50 shadow-sm"
                : "border-taupe-200 bg-white text-taupe-600 hover:border-taupe-400 hover:bg-sand-50"
            }`}
          >
            {active && (
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 12 12" fill="currentColor">
                <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </svg>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── ToggleGrid ───────────────────────────────────────────────

function ToggleGrid<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex h-12 items-center rounded-2xl border px-6 text-sm font-semibold transition-all active:scale-95 ${
            value === opt.value
              ? "border-ink-900 bg-ink-900 text-sand-50 shadow-sm"
              : "border-taupe-200 bg-white text-taupe-600 hover:border-taupe-400 hover:bg-sand-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Card, Label, TextArea, SectionTitle ─────────────────────

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mb-5 scroll-mt-24 font-serif text-2xl text-ink-900">
      {children}
    </h3>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-taupe-200/60 bg-white p-6 shadow-sm lg:p-8 ${className}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2.5 block text-sm font-semibold text-ink-900">
      {children}
    </label>
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full resize-none rounded-2xl border border-taupe-200/70 bg-sand-50/60 px-5 py-3.5 text-sm text-ink-900 placeholder-taupe-400 transition-colors focus:border-taupe-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
    />
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-taupe-200/70 bg-sand-50/60 px-5 py-3.5 text-sm text-ink-900 placeholder-taupe-400 transition-colors focus:border-taupe-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step = "any",
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === "" ? null : parseFloat(raw));
      }}
      placeholder={placeholder}
      step={step}
      min={0}
      className="w-full rounded-2xl border border-taupe-200/70 bg-sand-50/60 px-5 py-3.5 text-base text-ink-900 placeholder-taupe-400 transition-colors focus:border-taupe-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
    />
  );
}

// ─── Composant principal ──────────────────────────────────────

export function BilanForm({
  clients,
  preselectedClientId,
}: {
  clients: Profile[];
  preselectedClientId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nowISO = new Date().toISOString().slice(0, 16);
  const defaultClient = preselectedClientId ?? clients[0]?.id ?? "";

  const initTests = (): Tests =>
    Object.fromEntries(
      MOVEMENT_TESTS.map(({ key }) => [
        key,
        { score: 1 as const, score10: null, observation: "", note: "", zone: "" },
      ]),
    );

  const [form, setForm] = useState<FormState>({
    client_id: defaultClient,
    assessed_at: nowISO,
    sexe: null,
    age: null,
    energy_score: null,
    stress_score: null,
    sleep_score: null,
    pain_score: null,
    weight_kg: null,
    fat_pct: null,
    muscle_pct: null,
    water_pct: null,
    bone_mass_kg: null,
    visceral_fat: null,
    bmr_kcal: null,
    metabolic_age: null,
    seg_arm_right_kg: null,
    seg_arm_left_kg: null,
    seg_leg_right_kg: null,
    seg_leg_left_kg: null,
    seg_trunk_kg: null,
    main_goal: "",
    concrete_goal: "",
    old_injuries: "",
    operations: "",
    work_type: null,
    sport_practiced: "",
    activity_level: "",
    sitting_hours_per_day: null,
    pain_zones: "",
    mobility_score: null,
    stability_score: null,
    strength_score: null,
    posture_score: null,
    coordination_score: null,
    movement_tests: initTests(),
    daily_limitations: {},
    recommendations: {},
    zone_priorities: {},
    axis_notes: {},
    frequency: null,
    engagement: null,
    important_notes: "",
    next_action: "",
    pain_evolution: "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setAxisNote = (noteKey: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      axis_notes: { ...prev.axis_notes, [noteKey]: value },
    }));

  const setTest = <K extends keyof AssessmentTestEntry>(
    testKey: string,
    field: K,
    value: AssessmentTestEntry[K],
  ) =>
    setForm((prev) => ({
      ...prev,
      movement_tests: {
        ...prev.movement_tests,
        [testKey]: { ...prev.movement_tests[testKey], [field]: value },
      },
    }));

  const totalScore =
    (form.mobility_score ?? 0) +
    (form.stability_score ?? 0) +
    (form.strength_score ?? 0) +
    (form.posture_score ?? 0) +
    (form.coordination_score ?? 0);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSave() {
    if (!form.client_id) {
      setError("Sélectionnez un client.");
      return;
    }
    setError(null);
    startTransition(async () => {
      // Colonnes issues de migrations postérieures à la table initiale :
      // envoyées uniquement si non nulles pour éviter les erreurs "column not found"
      const {
        axis_notes,
        weight_kg, fat_pct, muscle_pct, water_pct,
        bone_mass_kg, visceral_fat, bmr_kcal, metabolic_age,
        seg_arm_right_kg, seg_arm_left_kg,
        seg_leg_right_kg, seg_leg_left_kg,
        seg_trunk_kg,
        zone_priorities,
        sexe, age,
        ...restForm
      } = form;
      const result = await createAssessmentAction({
        ...restForm,
        assessed_at: new Date(form.assessed_at).toISOString(),
        movement_tests: Object.keys(form.movement_tests).length ? form.movement_tests : null,
        daily_limitations: Object.keys(form.daily_limitations).length ? form.daily_limitations : null,
        recommendations: Object.keys(form.recommendations).length ? form.recommendations : null,
        main_goal: form.main_goal || null,
        concrete_goal: form.concrete_goal || null,
        old_injuries: form.old_injuries || null,
        operations: form.operations || null,
        sport_practiced: form.sport_practiced || null,
        activity_level: form.activity_level || null,
        pain_zones: form.pain_zones || null,
        important_notes: form.important_notes || null,
        next_action: form.next_action || null,
        pain_evolution: form.pain_evolution || null,
        motivation: null,
        // Migration 0008 — composition corporelle
        ...(weight_kg     != null ? { weight_kg     } : {}),
        ...(fat_pct       != null ? { fat_pct       } : {}),
        ...(muscle_pct    != null ? { muscle_pct    } : {}),
        ...(water_pct     != null ? { water_pct     } : {}),
        ...(bone_mass_kg  != null ? { bone_mass_kg  } : {}),
        ...(visceral_fat  != null ? { visceral_fat  } : {}),
        ...(bmr_kcal      != null ? { bmr_kcal      } : {}),
        ...(metabolic_age != null ? { metabolic_age } : {}),
        // Migration 0009 — zones prioritaires
        ...(Object.keys(zone_priorities).length > 0 ? { zone_priorities } : {}),
        // Migration 0010 — masse segmentaire
        ...(seg_arm_right_kg != null ? { seg_arm_right_kg } : {}),
        ...(seg_arm_left_kg  != null ? { seg_arm_left_kg  } : {}),
        ...(seg_leg_right_kg != null ? { seg_leg_right_kg } : {}),
        ...(seg_leg_left_kg  != null ? { seg_leg_left_kg  } : {}),
        ...(seg_trunk_kg     != null ? { seg_trunk_kg     } : {}),
        // Migration 0011 — notes par axe
        ...(Object.keys(axis_notes).length > 0 ? { axis_notes } : {}),
        // Migration 0014 — sexe et âge
        ...(sexe != null ? { sexe } : {}),
        ...(age  != null ? { age  } : {}),
      });
      if (result.error) {
        setError(result.error);
      } else if (result.id) {
        router.push(`/os/coach/bilan-mouvement/${result.id}`);
      }
    });
  }

  const selectedClient = clients.find((c) => c.id === form.client_id);

  return (
    <div className="relative mx-auto max-w-4xl">

      {/* ── Sticky section nav ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-5 mb-10 border-b border-taupe-200/60 bg-white/95 backdrop-blur-md lg:-mx-8">
        <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 lg:px-8">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold text-taupe-500 transition-colors hover:bg-sand-100 hover:text-ink-900"
            >
              {s.label}
            </button>
          ))}

          {/* Score + save in header */}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className="flex flex-col items-end">
              <span className={`text-lg font-bold leading-none tabular-nums ${scoreColor(totalScore)}`}>
                {totalScore}/100
              </span>
              <span className="text-[10px] text-taupe-400">{scoreLabel(totalScore)}</span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-xl bg-ink-900 px-4 py-2 text-xs font-semibold text-sand-50 transition-all hover:bg-taupe-800 active:scale-95 disabled:opacity-50"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────── */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-12">

        {/* ── Score global — Hero card ────────────────────────── */}
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:gap-10">

            {/* Score gauge */}
            <div className="flex flex-col items-center gap-3">
              <ScoreGauge score={totalScore} size={120} />
              <div className="text-center">
                <p className={`text-sm font-bold ${scoreColor(totalScore)}`}>{scoreLabel(totalScore)}</p>
                <p className="text-xs text-taupe-400">Score automatique</p>
              </div>
            </div>

            {/* Client + date + sexe + âge */}
            <div className="flex flex-1 flex-col gap-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                  Client
                </label>
                <select
                  value={form.client_id}
                  onChange={(e) => set("client_id", e.target.value)}
                  className="w-full rounded-2xl border border-taupe-200/70 bg-sand-50/60 px-5 py-3.5 text-base font-medium text-ink-900 focus:border-taupe-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
                >
                  <option value="">— Sélectionner un client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                    Sexe
                  </label>
                  <div className="flex gap-2">
                    {(["femme", "homme"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("sexe", form.sexe === s ? null : s)}
                        className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold capitalize transition-all active:scale-95 ${
                          form.sexe === s
                            ? "border-ink-900 bg-ink-900 text-sand-50 shadow-sm"
                            : "border-taupe-200 bg-white text-taupe-600 hover:border-taupe-400 hover:bg-sand-50"
                        }`}
                      >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                    Âge
                  </label>
                  <NumberInput
                    value={form.age}
                    onChange={(v) => set("age", v)}
                    placeholder="35"
                    step="1"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                  Date du bilan
                </label>
                <input
                  type="datetime-local"
                  value={form.assessed_at}
                  onChange={(e) => set("assessed_at", e.target.value)}
                  className="w-full rounded-2xl border border-taupe-200/70 bg-sand-50/60 px-5 py-3.5 text-sm text-ink-900 focus:border-taupe-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-taupe-500/20"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* ── Section 1 : Bilan subjectif ────────────────────── */}
        <div>
          <SectionTitle id="subjectif">1. Bilan subjectif</SectionTitle>
          <Card>
            <div className="space-y-8">
              <PremiumScoreRow
                label="Énergie"
                description="Comment vous sentez-vous globalement ?"
                value={form.energy_score}
                onChange={(v) => set("energy_score", v)}
              />
              <div className="h-px bg-taupe-100" />
              <PremiumScoreRow
                label="Stress"
                description="0 = nul · 10 = maximal"
                value={form.stress_score}
                onChange={(v) => set("stress_score", v)}
              />
              <div className="h-px bg-taupe-100" />
              <PremiumScoreRow
                label="Sommeil"
                description="0 = très mauvais · 10 = excellent"
                value={form.sleep_score}
                onChange={(v) => set("sleep_score", v)}
              />
              <div className="h-px bg-taupe-100" />
              <PremiumScoreRow
                label="Douleur globale"
                description="0 = aucune · 10 = intense"
                value={form.pain_score}
                onChange={(v) => set("pain_score", v)}
              />
            </div>
          </Card>
        </div>

        {/* ── Section 2 : Composition corporelle ────────────── */}
        <div>
          <SectionTitle id="composition">2. Composition corporelle</SectionTitle>
          <Card>
            <p className="mb-6 text-sm text-taupe-500">
              Saisir les mesures issues de l'impédancemètre. Les valeurs non renseignées n'apparaissent pas dans le rapport.
            </p>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {COMPOSITION_FIELDS.map((field) => (
                <div key={field.key}>
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <label className="text-base font-semibold text-ink-900">
                      {field.label}
                    </label>
                    {field.unit && (
                      <span className="text-sm font-medium text-taupe-400">{field.unit}</span>
                    )}
                  </div>
                  <NumberInput
                    value={form[field.key]}
                    onChange={(v) => set(field.key, v)}
                    placeholder={field.placeholder}
                    step={field.step}
                  />
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-taupe-100 pt-6">
              <p className="mb-5 text-sm font-semibold text-ink-900">
                Masse musculaire segmentaire
                <span className="ml-2 text-xs font-normal text-taupe-400">kg — optionnel</span>
              </p>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {SEGMENTAL_FIELDS.map((field) => (
                  <div key={field.key}>
                    <div className="mb-2.5 flex items-baseline justify-between">
                      <label className="text-base font-semibold text-ink-900">
                        {field.label}
                      </label>
                      <span className="text-sm font-medium text-taupe-400">kg</span>
                    </div>
                    <NumberInput
                      value={form[field.key]}
                      onChange={(v) => set(field.key, v)}
                      placeholder="0,00"
                      step="0.01"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* ── Section 3 : Tests de mouvement ─────────────────── */}
        <div>
          <SectionTitle id="tests">3. Tests de mouvement</SectionTitle>
          <div className="grid gap-5 lg:grid-cols-2">
            {MOVEMENT_TESTS.map((test) => {
              const entry = form.movement_tests[test.key];
              return (
                <Card key={test.key} className="flex flex-col gap-5">
                  <div>
                    <p className="text-base font-bold text-ink-900">{test.label}</p>
                    <p className="mt-1 text-sm text-taupe-400">{test.desc}</p>
                  </div>

                  {/* 3 big score buttons */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {TEST_SCORES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setTest(test.key, "score", s.value)}
                        className={`flex flex-col items-center justify-center rounded-2xl border py-4 text-center transition-all active:scale-95 ${
                          entry.score === s.value ? s.active : s.inactive
                        }`}
                      >
                        <span className="text-lg font-bold leading-none">{s.value}</span>
                        <span className="mt-1 text-xs font-medium leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>

                  <PremiumScoreRow
                    label="Score /10"
                    value={entry.score10 ?? null}
                    onChange={(v) => setTest(test.key, "score10", v)}
                  />

                  <div className="space-y-3">
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                        Observation
                      </label>
                      <TextArea
                        value={entry.observation}
                        onChange={(v) => setTest(test.key, "observation", v)}
                        placeholder="Ce que j'ai observé…"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                        Note coach
                      </label>
                      <TextArea
                        value={entry.note}
                        onChange={(v) => setTest(test.key, "note", v)}
                        placeholder="Point d'attention, progression attendue…"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                        Zone concernée
                      </label>
                      <TextInput
                        value={entry.zone ?? ""}
                        onChange={(v) => setTest(test.key, "zone", v)}
                        placeholder="Hanches, épaules, lombaires…"
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Section 4 : Mode de vie ─────────────────────────── */}
        <div>
          <SectionTitle id="mode-vie">4. Mode de vie</SectionTitle>
          <div className="space-y-5">
            <Card>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Objectif principal</Label>
                  <TextArea
                    value={form.main_goal}
                    onChange={(v) => set("main_goal", v)}
                    placeholder="Perdre du poids, gagner en force, améliorer ma posture…"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Objectif concret mesurable</Label>
                  <TextArea
                    value={form.concrete_goal}
                    onChange={(v) => set("concrete_goal", v)}
                    placeholder="-5 kg en 3 mois, courir 5 km, soulever 80 kg…"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Blessures anciennes</Label>
                  <TextArea
                    value={form.old_injuries}
                    onChange={(v) => set("old_injuries", v)}
                    placeholder="Entorse cheville 2019, tendinite épaule…"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Opérations / antécédents chirurgicaux</Label>
                  <TextArea
                    value={form.operations}
                    onChange={(v) => set("operations", v)}
                    placeholder="Opération genou 2020…"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            <Card>
              <div className="space-y-6">
                <div>
                  <Label>Type de travail</Label>
                  <ToggleGrid
                    options={[
                      { value: "assis", label: "Assis" },
                      { value: "debout", label: "Debout" },
                      { value: "physique", label: "Physique" },
                      { value: "mixte", label: "Mixte" },
                    ]}
                    value={form.work_type}
                    onChange={(v) => set("work_type", v)}
                  />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label>Sport pratiqué</Label>
                    <TextInput
                      value={form.sport_practiced}
                      onChange={(v) => set("sport_practiced", v)}
                      placeholder="Running, natation, gym…"
                    />
                  </div>
                  <div>
                    <Label>Niveau d'activité</Label>
                    <TextInput
                      value={form.activity_level}
                      onChange={(v) => set("activity_level", v)}
                      placeholder="Sédentaire, actif, sportif régulier…"
                    />
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label>Temps assis par jour</Label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => set("sitting_hours_per_day", Math.max(0, (form.sitting_hours_per_day ?? 0) - 1))}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-taupe-200 bg-white text-xl text-taupe-600 transition-all hover:border-taupe-400 hover:bg-sand-100 active:scale-95"
                      >
                        −
                      </button>
                      <span className="flex-1 text-center text-2xl font-bold text-ink-900">
                        {form.sitting_hours_per_day ?? 0}
                        <span className="ml-1 text-base font-normal text-taupe-400">h</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => set("sitting_hours_per_day", Math.min(24, (form.sitting_hours_per_day ?? 0) + 1))}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-taupe-200 bg-white text-xl text-taupe-600 transition-all hover:border-taupe-400 hover:bg-sand-100 active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>Zones de douleur</Label>
                    <TextInput
                      value={form.pain_zones}
                      onChange={(v) => set("pain_zones", v)}
                      placeholder="Lombaires, épaule droite, genou…"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ── Section zones prioritaires ─────────────────────── */}
        <div>
          <SectionTitle id="zones">Zones prioritaires à travailler</SectionTitle>
          <Card>
            <p className="mb-6 text-sm text-taupe-500">
              Indiquer le niveau de priorité pour chaque zone corporelle. Les zones non cochées n'apparaissent pas dans le rapport.
            </p>
            <div className="space-y-3">
              {BODY_ZONES.map((zone) => {
                const current = form.zone_priorities[zone.key] as ZonePriority | undefined;
                return (
                  <div key={zone.key} className="flex items-center gap-4 rounded-2xl border border-taupe-100 bg-sand-50/40 px-5 py-3.5">
                    <span className="w-36 shrink-0 text-base font-semibold text-ink-900">{zone.label}</span>
                    <div className="flex flex-wrap gap-2">
                      {ZONE_PRIORITIES.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              const next = { ...prev.zone_priorities };
                              if (next[zone.key] === p.value) {
                                delete next[zone.key];
                              } else {
                                next[zone.key] = p.value;
                              }
                              return { ...prev, zone_priorities: next };
                            })
                          }
                          className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-all active:scale-95 ${
                            current === p.value ? p.active : p.inactive
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                      {current && (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              const next = { ...prev.zone_priorities };
                              delete next[zone.key];
                              return { ...prev, zone_priorities: next };
                            })
                          }
                          className="rounded-xl border border-taupe-200 px-3 py-2 text-xs text-taupe-400 transition-all hover:border-taupe-400 active:scale-95"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* ── Section 5 : Synthèse fonctionnelle ─────────────── */}
        <div>
          <SectionTitle id="scores">5. Synthèse fonctionnelle</SectionTitle>

          {/* Récapitulatif des tests */}
          <div className="mb-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-taupe-400">
              Récapitulatif des tests de mouvement
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MOVEMENT_TESTS.map((test) => {
                const entry = form.movement_tests[test.key];
                const s10 = entry.score10;
                return (
                  <div
                    key={test.key}
                    className="flex flex-col items-center rounded-2xl border border-taupe-200/60 bg-white px-3 py-4 text-center shadow-sm"
                  >
                    <p className="mb-2 text-xs font-semibold leading-tight text-taupe-500">
                      {test.label}
                    </p>
                    {s10 !== null && s10 !== undefined ? (
                      <p className={`text-2xl font-bold tabular-nums leading-none ${scoreColor(s10 * 10)}`}>
                        {s10}
                        <span className="text-sm font-normal text-taupe-400">/10</span>
                      </p>
                    ) : (
                      <p className="text-xl font-bold leading-none text-taupe-300">—</p>
                    )}
                    {entry.zone ? (
                      <p className="mt-1.5 max-w-full truncate text-xs text-taupe-400">{entry.zone}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cartes par axe */}
          <div className="grid gap-5 lg:grid-cols-2">
            {AXES.map((axis) => {
              const stored = form[axis.key] as number | null;
              const displayVal = stored !== null ? stored / 2 : null;
              return (
                <Card key={axis.key} className="flex flex-col gap-5">
                  <div>
                    <p className="text-base font-bold text-ink-900">{axis.label}</p>
                    <p className="mt-1 text-sm text-taupe-400">{axis.desc}</p>
                  </div>

                  <PremiumScoreRow
                    label="Score"
                    value={displayVal}
                    onChange={(v) => set(axis.key, v * 2)}
                  />

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-taupe-400">
                      Observation
                    </label>
                    <TextArea
                      value={form.axis_notes[axis.noteKey] ?? ""}
                      onChange={(v) => setAxisNote(axis.noteKey, v)}
                      placeholder="Observation sur cet axe…"
                      rows={2}
                    />
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Score total */}
          <div className="mt-5 flex items-center justify-between rounded-3xl bg-ink-900 px-7 py-5">
            <div>
              <p className="text-sm font-medium text-sand-300">Score total automatique</p>
              <p className="text-xs text-sand-500">Somme des 5 axes</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-5xl font-bold tabular-nums ${scoreColor(totalScore)}`}>
                {totalScore}
              </span>
              <span className="text-lg font-normal text-sand-400">/100</span>
            </div>
          </div>
        </div>

        {/* ── Section 6 : Limitations quotidiennes ───────────── */}
        <div>
          <SectionTitle id="limitations">6. Limitations quotidiennes</SectionTitle>
          <Card>
            <p className="mb-5 text-sm text-taupe-500">Sélectionnez toutes les limitations que le client rapporte.</p>
            <ChipGrid
              items={LIMITATIONS}
              values={form.daily_limitations}
              onChange={(k, v) =>
                setForm((prev) => ({
                  ...prev,
                  daily_limitations: { ...prev.daily_limitations, [k]: v },
                }))
              }
            />
          </Card>
        </div>

        {/* ── Section 7 : Recommandations ────────────────────── */}
        <div>
          <SectionTitle id="recommandations">7. Recommandations</SectionTitle>
          <Card>
            <p className="mb-5 text-sm text-taupe-500">Axes de travail à prioriser pour ce client.</p>
            <ChipGrid
              items={RECOMMENDATIONS}
              values={form.recommendations}
              onChange={(k, v) =>
                setForm((prev) => ({
                  ...prev,
                  recommendations: { ...prev.recommendations, [k]: v },
                }))
              }
            />
          </Card>
        </div>

        {/* ── Section 8 : Programme ──────────────────────────── */}
        <div>
          <SectionTitle id="programme">8. Programme recommandé</SectionTitle>
          <Card>
            <div className="space-y-7">
              <div>
                <Label>Fréquence conseillée</Label>
                <ToggleGrid
                  options={[
                    { value: "1x/semaine", label: "1×/semaine" },
                    { value: "2x/semaine", label: "2×/semaine" },
                    { value: "3x/semaine", label: "3×/semaine" },
                    { value: "4x/semaine", label: "4×/semaine" },
                    { value: "5x/semaine", label: "5×/semaine" },
                  ]}
                  value={form.frequency}
                  onChange={(v) => set("frequency", v)}
                />
              </div>
              <div className="h-px bg-taupe-100" />
              <div>
                <Label>Niveau d'engagement actuel</Label>
                <div className="flex flex-col gap-2.5">
                  {(
                    [
                      "J'ai besoin d'être guidé(e) pour démarrer",
                      "Je suis prêt(e) à progresser régulièrement",
                      "Je suis pleinement engagé(e) dans ma transformation",
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set("engagement", form.engagement === opt ? null : opt)}
                      className={`flex items-center gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-medium transition-all active:scale-[0.99] ${
                        form.engagement === opt
                          ? "border-ink-900 bg-ink-900 text-sand-50 shadow-sm"
                          : "border-taupe-200 bg-white text-taupe-700 hover:border-taupe-400 hover:bg-sand-50"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                          form.engagement === opt
                            ? "border-sand-400 text-sand-100"
                            : "border-taupe-300 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Section 9 : Notes & suite ──────────────────────── */}
        <div>
          <SectionTitle id="notes">9. Notes & suite</SectionTitle>
          <Card>
            <div className="space-y-5">
              <div>
                <Label>Notes importantes</Label>
                <TextArea
                  value={form.important_notes}
                  onChange={(v) => set("important_notes", v)}
                  placeholder="Précautions particulières, contre-indications, observations clés…"
                  rows={4}
                />
              </div>
              <div>
                <Label>Prochaine action recommandée</Label>
                <TextArea
                  value={form.next_action}
                  onChange={(v) => set("next_action", v)}
                  placeholder="Planifier séance bilan dans 6 semaines, travailler les hanches…"
                  rows={2}
                />
              </div>
              <div>
                <Label>Évolution douleur (contexte)</Label>
                <TextArea
                  value={form.pain_evolution}
                  onChange={(v) => set("pain_evolution", v)}
                  placeholder="Douleur dorsale améliorée depuis 3 semaines…"
                  rows={2}
                />
              </div>

            </div>
          </Card>
        </div>

        {/* ── Bottom save bar ─────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-3xl border border-taupe-200/60 bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm text-taupe-500">Score calculé automatiquement</p>
            <p className={`mt-0.5 text-3xl font-bold tabular-nums ${scoreColor(totalScore)}`}>
              {totalScore}
              <span className="ml-1 text-lg font-normal text-taupe-400">/100</span>
            </p>
            <p className={`text-sm font-semibold ${scoreColor(totalScore)}`}>{scoreLabel(totalScore)}</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="rounded-2xl bg-ink-900 px-10 py-4 text-base font-semibold text-sand-50 shadow-sm transition-all hover:bg-taupe-800 active:scale-95 disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : "Enregistrer le bilan"}
          </button>
        </div>

        {/* Bottom spacer for floating button */}
        <div className="h-24" />
      </div>

      {/* ── Floating save button ────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 rounded-full bg-ink-900 px-6 py-4 shadow-xl shadow-ink-900/20 transition-colors hover:bg-taupe-800 disabled:opacity-50"
        >
          <span className="text-sm font-semibold text-sand-50">
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </span>
          <span className={`rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-bold tabular-nums ${scoreColor(totalScore)}`}>
            {totalScore}/100
          </span>
        </motion.button>
      </div>
    </div>
  );
}
