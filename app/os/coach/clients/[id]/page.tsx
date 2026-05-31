import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getProfileById,
} from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import {
  OsField,
  OsTextarea,
  OsSelect,
  OsSubmitButton,
  OsFlash,
} from "@/app/os/_components/OsFields";
import type {
  Session,
  SessionPack,
  Measure,
  CoachNote,
  Questionnaire,
  MovementTest,
  ClientGoal,
} from "@/lib/os/types";
import {
  createSessionAction,
  updateSessionStatusAction,
  createNoteAction,
  toggleNotePinnedAction,
  createMeasureAction,
  createPackAction,
  markQuestionnaireReadAction,
  createMovementTestAction,
  createGoalAction,
  updateGoalStatusAction,
} from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getProfileById(id);
  return {
    title: `${client?.display_name ?? "Client"} · Coach`,
    robots: { index: false, follow: false },
  } satisfies Metadata;
}

const TABS = [
  { key: "seances", label: "Séances" },
  { key: "notes", label: "Notes" },
  { key: "mesures", label: "Mesures" },
  { key: "mouvement", label: "Mouvement" },
  { key: "objectifs", label: "Objectifs" },
  { key: "pack", label: "Pack" },
  { key: "questionnaire", label: "Questionnaire" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const STATUS_CLS: Record<string, string> = {
  planifiée: "bg-blue-50 text-blue-700",
  réalisée: "bg-emerald-50 text-emerald-800",
  annulée: "bg-red-50 text-red-700",
  no_show: "bg-taupe-100 text-taupe-600",
};

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtDateShort = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function CoachClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    tab?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { id } = await params;
  const {
    tab: rawTab = "seances",
    saved,
    error,
  } = await searchParams;
  const tab = (TABS.some((t) => t.key === rawTab) ? rawTab : "seances") as TabKey;

  const client = await getProfileById(id);
  const isAdmin = profile.roles.includes("admin");
  if (!client || (!isAdmin && client.coach_id !== profile.id)) redirect("/os/coach/clients");

  const supabase = await getSupabaseServer();

  const [
    sessionsRes,
    notesRes,
    measuresRes,
    packsRes,
    qRes,
    movementRes,
    goalsRes,
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("client_id", id)
      .order("scheduled_at", { ascending: false }),
    supabase
      .from("coach_notes")
      .select("*")
      .eq("client_id", id)
      .eq("coach_id", profile.id)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("measures")
      .select("*")
      .eq("client_id", id)
      .order("measured_at", { ascending: false }),
    supabase
      .from("session_packs")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("questionnaires")
      .select("*")
      .eq("client_id", id)
      .maybeSingle(),
    supabase
      .from("movement_tests")
      .select("*")
      .eq("client_id", id)
      .order("tested_at", { ascending: false }),
    supabase
      .from("client_goals")
      .select("*")
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const sessions = (sessionsRes.data ?? []) as Session[];
  const notes = (notesRes.data ?? []) as CoachNote[];
  const measures = (measuresRes.data ?? []) as Measure[];
  const packs = (packsRes.data ?? []) as SessionPack[];
  const questionnaire = qRes.data as Questionnaire | null;
  const movementTests = (movementRes.data ?? []) as MovementTest[];
  const goals = (goalsRes.data ?? []) as ClientGoal[];

  return (
    <OsShell profile={profile} title={client.display_name}>
      {/* En-tête client */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/os/coach/clients"
            className="text-xs text-taupe-500 transition-colors hover:text-ink-900"
          >
            ← Mes clients
          </Link>
          <h2 className="mt-2 font-serif text-2xl text-ink-900">
            {client.display_name}
          </h2>
          <p className="mt-0.5 text-sm text-taupe-500">
            {client.email}
            {client.phone ? ` · ${client.phone}` : ""}
          </p>
        </div>
        {!client.active && (
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs text-red-700">
            Compte inactif
          </span>
        )}
      </div>

      {/* Widget résumé rapide */}
      <ClientSummary
        packs={packs}
        sessions={sessions}
        goals={goals}
        questionnaire={questionnaire}
      />

      {/* Flash */}
      <OsFlash saved={saved} error={error} />

      {/* Onglets */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-taupe-300/40 bg-white p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`?tab=${t.key}`}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-taupe-700 text-sand-50"
                : "text-taupe-600 hover:bg-sand-100 hover:text-ink-900"
            }`}
          >
            {t.label}
            {t.key === "notes" && notes.length > 0 && (
              <span className="ml-1.5 text-xs opacity-70">
                {notes.length}
              </span>
            )}
            {t.key === "questionnaire" &&
              questionnaire?.status === "soumis" && (
                <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
              )}
          </Link>
        ))}
      </div>

      {/* Contenu des onglets */}
      <div>
        {tab === "seances" && (
          <SeancesTab
            sessions={sessions}
            packs={packs}
            clientId={id}
          />
        )}
        {tab === "notes" && (
          <NotesTab notes={notes} clientId={id} />
        )}
        {tab === "mesures" && (
          <MesuresTab measures={measures} clientId={id} />
        )}
        {tab === "mouvement" && (
          <MouvementTab tests={movementTests} clientId={id} />
        )}
        {tab === "objectifs" && (
          <ObjectifsTab goals={goals} clientId={id} />
        )}
        {tab === "pack" && (
          <PackTab packs={packs} clientId={id} />
        )}
        {tab === "questionnaire" && (
          <QuestionnaireTab
            questionnaire={questionnaire}
            clientId={id}
          />
        )}
      </div>
    </OsShell>
  );
}

// ── Onglet Séances ─────────────────────────────────────────────

const SESSION_STATUS_OPTIONS = [
  { value: "planifiée", label: "Planifiée" },
  { value: "réalisée", label: "Réalisée" },
  { value: "annulée", label: "Annulée" },
  { value: "no_show", label: "No show" },
];

function SeancesTab({
  sessions,
  packs,
  clientId,
}: {
  sessions: Session[];
  packs: SessionPack[];
  clientId: string;
}) {
  const packOptions = [
    { value: "", label: "— Sans pack —" },
    ...packs
      .filter((p) => p.remaining > 0)
      .map((p) => ({
        value: p.id,
        label: `${p.offer_label} (${p.remaining} restantes)`,
      })),
  ];

  return (
    <div className="space-y-6">
      {/* Formulaire ajout */}
      <Card title="Planifier une séance">
        <form
          action={createSessionAction}
          className="grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <OsField
            label="Date et heure"
            name="scheduled_at"
            type="datetime-local"
            required
          />
          <OsField
            label="Durée (min)"
            name="duration_min"
            type="number"
            defaultValue="60"
            min="15"
            step="15"
          />
          <OsField label="Lieu (optionnel)" name="location" />
          <OsSelect
            label="Pack (optionnel)"
            name="pack_id"
            options={packOptions}
          />
          <div className="flex justify-end md:col-span-2">
            <OsSubmitButton>Ajouter la séance →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {/* Liste */}
      {sessions.length === 0 ? (
        <p className="text-center text-sm text-taupe-500 py-6">
          Aucune séance pour ce client.
        </p>
      ) : (
        <div className="rounded-2xl border border-taupe-300/40 bg-white overflow-hidden">
          <ul className="divide-y divide-taupe-300/20">
            {sessions.map((s) => (
              <li key={s.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink-900">
                      {fmtDate.format(new Date(s.scheduled_at))}
                    </p>
                    <p className="text-xs text-taupe-500">
                      {s.duration_min} min
                      {s.location ? ` · ${s.location}` : ""}
                    </p>
                    {s.summary && (
                      <p className="mt-1 text-xs text-taupe-600">{s.summary}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[s.status] ?? "bg-sand-100 text-taupe-600"}`}
                    >
                      {s.status}
                    </span>
                    {/* Changement rapide de statut */}
                    <form action={updateSessionStatusAction} className="flex items-center gap-2">
                      <input type="hidden" name="client_id" value={clientId} />
                      <input type="hidden" name="session_id" value={s.id} />
                      <select
                        name="status"
                        defaultValue={s.status}
                        className="rounded-lg border border-taupe-300/50 bg-white px-2 py-1 text-xs text-ink-900 focus:outline-none"
                      >
                        {SESSION_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-lg bg-taupe-100 px-2 py-1 text-xs text-taupe-700 hover:bg-taupe-200"
                      >
                        ✓
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Onglet Notes ───────────────────────────────────────────────

function NotesTab({
  notes,
  clientId,
}: {
  notes: CoachNote[];
  clientId: string;
}) {
  return (
    <div className="space-y-6">
      <Card title="Ajouter une note">
        <form action={createNoteAction} className="space-y-4">
          <input type="hidden" name="client_id" value={clientId} />
          <OsTextarea
            label="Note privée (invisible du client)"
            name="body"
            rows={3}
            required
            placeholder="Observations, objectifs, progression…"
          />
          <div className="flex justify-end">
            <OsSubmitButton>Ajouter →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {notes.length === 0 ? (
        <p className="text-center text-sm text-taupe-500 py-6">
          Aucune note pour ce client.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-5 ${n.pinned ? "border-taupe-400/60 bg-sand-100/50" : "border-taupe-300/40 bg-white"}`}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <p className="text-xs text-taupe-400">
                  {fmtDate.format(new Date(n.created_at))}
                  {n.pinned && (
                    <span className="ml-2 text-taupe-600">📌</span>
                  )}
                </p>
                <form action={toggleNotePinnedAction}>
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="note_id" value={n.id} />
                  <input
                    type="hidden"
                    name="pinned"
                    value={String(n.pinned)}
                  />
                  <button
                    type="submit"
                    className="text-xs text-taupe-400 hover:text-taupe-700"
                  >
                    {n.pinned ? "Désépingler" : "Épingler"}
                  </button>
                </form>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink-900">
                {n.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Onglet Mesures ─────────────────────────────────────────────

function MesuresTab({
  measures,
  clientId,
}: {
  measures: Measure[];
  clientId: string;
}) {
  return (
    <div className="space-y-6">
      <Card title="Ajouter des mesures">
        <form
          action={createMeasureAction}
          className="grid gap-4 md:grid-cols-3"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <OsField
            label="Date"
            name="measured_at"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
          <OsField label="Poids (kg)" name="weight_kg" type="number" step="0.1" placeholder="ex : 72.5" />
          <OsField label="Masse grasse (%)" name="fat_pct" type="number" step="0.1" />
          <OsField label="Masse musculaire (%)" name="muscle_pct" type="number" step="0.1" />
          <OsField label="Eau (%)" name="water_pct" type="number" step="0.1" />
          <OsField label="IMC" name="bmi" type="number" step="0.01" />
          <OsField label="Métabolisme de base (kcal)" name="bmr_kcal" type="number" />
          <OsField label="Tour de taille (cm)" name="waist_cm" type="number" step="0.1" />
          <OsField label="Tour de hanches (cm)" name="hip_cm" type="number" step="0.1" />
          <div className="md:col-span-3">
            <OsTextarea label="Notes" name="notes" rows={2} />
          </div>
          <div className="flex justify-end md:col-span-3">
            <OsSubmitButton>Enregistrer les mesures →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {measures.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-taupe-300/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-taupe-300/30">
                {["Date", "Poids", "Grasse", "Muscle", "IMC", "Notes"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs uppercase tracking-wider text-taupe-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-300/20">
              {measures.map((m) => (
                <tr key={m.id} className="hover:bg-sand-50">
                  <td className="px-4 py-3 text-taupe-700">
                    {fmtDateShort.format(new Date(m.measured_at))}
                  </td>
                  <td className="px-4 py-3">{m.weight_kg ?? "—"}</td>
                  <td className="px-4 py-3">
                    {m.fat_pct != null ? `${m.fat_pct} %` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {m.muscle_pct != null ? `${m.muscle_pct} %` : "—"}
                  </td>
                  <td className="px-4 py-3">{m.bmi ?? "—"}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-taupe-500">
                    {m.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Onglet Mouvement ───────────────────────────────────────────

const TEST_TYPE_OPTIONS = [
  { value: "mobilité", label: "Mobilité" },
  { value: "force", label: "Force" },
  { value: "cardio", label: "Cardio" },
  { value: "équilibre", label: "Équilibre" },
  { value: "autre", label: "Autre" },
];

function MouvementTab({
  tests,
  clientId,
}: {
  tests: MovementTest[];
  clientId: string;
}) {
  return (
    <div className="space-y-6">
      <Card title="Ajouter un test">
        <form
          action={createMovementTestAction}
          className="grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <OsField
            label="Date"
            name="tested_at"
            type="date"
            defaultValue={new Date().toISOString().split("T")[0]}
          />
          <OsSelect
            label="Type"
            name="test_type"
            options={TEST_TYPE_OPTIONS}
          />
          <OsField
            label="Nom du test"
            name="test_name"
            required
            placeholder="ex : Deep squat, FMS, VO2max…"
          />
          <OsField
            label="Résultat"
            name="result"
            required
            placeholder="ex : 3/3, 45 ml/kg/min"
          />
          <OsField
            label="Unité (optionnel)"
            name="unit"
            placeholder="ex : reps, cm, s"
          />
          <div className="md:col-span-2">
            <OsTextarea label="Notes" name="notes" rows={2} />
          </div>
          <div className="flex justify-end md:col-span-2">
            <OsSubmitButton>Enregistrer →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {tests.length === 0 ? (
        <p className="py-6 text-center text-sm text-taupe-500">
          Aucun test enregistré pour ce client.
        </p>
      ) : (
        <div className="rounded-2xl border border-taupe-300/40 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-taupe-300/30">
                {["Date", "Type", "Test", "Résultat", "Notes"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-taupe-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-300/20">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-sand-50">
                  <td className="px-4 py-3 text-taupe-700">
                    {fmtDateShort.format(new Date(t.tested_at))}
                  </td>
                  <td className="px-4 py-3 capitalize text-taupe-600">
                    {t.test_type}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {t.test_name}
                  </td>
                  <td className="px-4 py-3">
                    {t.result}
                    {t.unit ? ` ${t.unit}` : ""}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-taupe-500">
                    {t.notes ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Onglet Objectifs ───────────────────────────────────────────

const GOAL_STATUS_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "atteint", label: "Atteint" },
  { value: "abandonné", label: "Abandonné" },
];

const GOAL_STATUS_CLS: Record<string, string> = {
  actif: "bg-blue-50 text-blue-700",
  atteint: "bg-emerald-50 text-emerald-800",
  abandonné: "bg-taupe-100 text-taupe-600",
};

function ObjectifsTab({
  goals,
  clientId,
}: {
  goals: ClientGoal[];
  clientId: string;
}) {
  return (
    <div className="space-y-6">
      <Card title="Ajouter un objectif">
        <form action={createGoalAction} className="space-y-4">
          <input type="hidden" name="client_id" value={clientId} />
          <OsField
            label="Titre de l&apos;objectif"
            name="title"
            required
            placeholder="ex : Perdre 5 kg, Courir 10 km…"
          />
          <OsTextarea
            label="Description (optionnel)"
            name="description"
            rows={2}
            placeholder="Détails, étapes, contexte…"
          />
          <OsField
            label="Date cible (optionnel)"
            name="target_date"
            type="date"
          />
          <div className="flex justify-end">
            <OsSubmitButton>Ajouter →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {goals.length === 0 ? (
        <p className="py-6 text-center text-sm text-taupe-500">
          Aucun objectif défini pour ce client.
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map((g) => (
            <div
              key={g.id}
              className={`rounded-2xl border p-5 ${
                g.status === "atteint"
                  ? "border-emerald-300/40 bg-emerald-50/50"
                  : g.status === "abandonné"
                    ? "border-taupe-300/20 bg-sand-50 opacity-70"
                    : "border-taupe-300/40 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink-900">{g.title}</p>
                  {g.description && (
                    <p className="mt-1 text-sm text-taupe-600">
                      {g.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${GOAL_STATUS_CLS[g.status] ?? "bg-sand-100 text-taupe-600"}`}
                    >
                      {g.status}
                    </span>
                    {g.target_date && (
                      <span className="text-xs text-taupe-400">
                        Cible : {fmtDateShort.format(new Date(g.target_date))}
                      </span>
                    )}
                    {g.achieved_at && (
                      <span className="text-xs text-emerald-700">
                        Atteint le {fmtDateShort.format(new Date(g.achieved_at))}
                      </span>
                    )}
                  </div>
                </div>
                <form action={updateGoalStatusAction} className="shrink-0">
                  <input type="hidden" name="client_id" value={clientId} />
                  <input type="hidden" name="goal_id" value={g.id} />
                  <OsSelect
                    label=""
                    name="status"
                    options={GOAL_STATUS_OPTIONS}
                    defaultValue={g.status}
                  />
                  <button
                    type="submit"
                    className="mt-1 w-full rounded-lg bg-taupe-100 px-3 py-1 text-xs text-taupe-700 hover:bg-taupe-200"
                  >
                    Mettre à jour
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Onglet Pack ────────────────────────────────────────────────

function PackTab({
  packs,
  clientId,
}: {
  packs: SessionPack[];
  clientId: string;
}) {
  return (
    <div className="space-y-6">
      <Card title="Créer un pack séances">
        <form
          action={createPackAction}
          className="grid gap-4 md:grid-cols-2"
        >
          <input type="hidden" name="client_id" value={clientId} />
          <OsField
            label="Intitulé de l&apos;offre"
            name="offer_label"
            required
            placeholder="ex : Coaching mobilité 10 séances"
          />
          <OsField
            label="Nombre de séances"
            name="total"
            type="number"
            min="1"
            defaultValue="10"
            required
          />
          <OsField
            label="Date d&apos;expiration (optionnel)"
            name="expires_at"
            type="date"
          />
          <div className="flex items-end justify-end md:col-span-2">
            <OsSubmitButton>Créer le pack →</OsSubmitButton>
          </div>
        </form>
      </Card>

      {packs.length === 0 ? (
        <p className="text-center text-sm text-taupe-500 py-6">
          Aucun pack créé pour ce client.
        </p>
      ) : (
        <div className="space-y-3">
          {packs.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-5 ${p.remaining > 0 ? "border-taupe-300/40 bg-white" : "border-taupe-300/20 bg-sand-50 opacity-70"}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-ink-900">{p.offer_label}</p>
                  <p className="mt-0.5 text-xs text-taupe-500">
                    Créé le{" "}
                    {fmtDateShort.format(new Date(p.purchased_at))}
                    {p.expires_at &&
                      ` · Expire le ${fmtDateShort.format(new Date(p.expires_at))}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-serif text-2xl text-ink-900">
                    {p.remaining}
                    <span className="text-sm text-taupe-500">
                      /{p.total}
                    </span>
                  </p>
                  <p className="text-xs text-taupe-500">séances restantes</p>
                </div>
              </div>
              {p.remaining === 0 && (
                <p className="mt-2 text-xs text-taupe-400">Pack épuisé</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Onglet Questionnaire ───────────────────────────────────────

function QuestionnaireTab({
  questionnaire,
  clientId,
}: {
  questionnaire: Questionnaire | null;
  clientId: string;
}) {
  if (!questionnaire) {
    return (
      <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-10 text-center">
        <p className="font-serif text-lg text-ink-900">
          Aucun questionnaire envoyé
        </p>
        <p className="mt-2 text-sm text-taupe-600">
          Le questionnaire est créé automatiquement quand le client est invité.
        </p>
      </div>
    );
  }

  const a = questionnaire.answers;

  return (
    <div className="space-y-6">
      {/* Statut + action */}
      <div className="flex items-center justify-between rounded-2xl border border-taupe-300/40 bg-white px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-taupe-500">
            Statut
          </p>
          <p className="mt-1 font-medium text-ink-900">
            {questionnaire.status === "soumis" && "Soumis par le client"}
            {questionnaire.status === "en_attente" &&
              "En attente de réponse"}
            {questionnaire.status === "relu" && "Lu et commenté"}
          </p>
          {questionnaire.submitted_at && (
            <p className="text-xs text-taupe-500">
              Soumis le{" "}
              {fmtDate.format(new Date(questionnaire.submitted_at))}
            </p>
          )}
        </div>
        {questionnaire.status === "soumis" && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
            Nouveau
          </span>
        )}
      </div>

      {/* Réponses */}
      {a && (
        <div className="rounded-2xl border border-taupe-300/40 bg-white divide-y divide-taupe-300/20">
          {[
            { label: "Objectif principal", value: a.main_goal },
            {
              label: "Objectifs secondaires",
              value: a.secondary_goals?.join(", "),
            },
            { label: "Motivation", value: a.motivation },
            { label: "Antécédents médicaux", value: a.medical_history },
            { label: "Blessures", value: a.injuries },
            { label: "Médicaments", value: a.medications },
            { label: "Activité actuelle", value: a.current_activity },
            {
              label: "Fréquence d'entraînement",
              value: a.activity_frequency,
            },
            {
              label: "Heures de sommeil",
              value: a.sleep_hours != null ? `${a.sleep_hours}h` : null,
            },
            {
              label: "Niveau de stress",
              value: a.stress_level != null ? `${a.stress_level}/5` : null,
            },
            { label: "Alimentation", value: a.diet_description },
            {
              label: "Restrictions alimentaires",
              value: a.dietary_restrictions,
            },
            { label: "Disponibilités", value: a.availability },
            { label: "Créneaux préférés", value: a.preferred_schedule },
            { label: "Informations complémentaires", value: a.additional_info },
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

      {/* Formulaire commentaire + validation */}
      {questionnaire.status === "soumis" && (
        <Card title="Marquer comme lu">
          <form action={markQuestionnaireReadAction} className="space-y-4">
            <input type="hidden" name="client_id" value={clientId} />
            <input
              type="hidden"
              name="questionnaire_id"
              value={questionnaire.id}
            />
            <OsTextarea
              label="Commentaire coach (optionnel)"
              name="coach_comment"
              rows={3}
              placeholder="Retour, recommandations, questions…"
            />
            <div className="flex justify-end">
              <OsSubmitButton>Marquer comme lu →</OsSubmitButton>
            </div>
          </form>
        </Card>
      )}

      {/* Commentaire existant */}
      {questionnaire.status === "relu" && questionnaire.coach_comment && (
        <div className="rounded-2xl border border-taupe-300/40 bg-sand-50 p-5">
          <p className="text-xs uppercase tracking-wider text-taupe-500">
            Votre commentaire
          </p>
          <p className="mt-2 text-sm text-ink-900">
            {questionnaire.coach_comment}
          </p>
          {questionnaire.reviewed_at && (
            <p className="mt-2 text-xs text-taupe-400">
              Lu le {fmtDate.format(new Date(questionnaire.reviewed_at))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Widget résumé ──────────────────────────────────────────────

function ClientSummary({
  packs,
  sessions,
  goals,
  questionnaire,
}: {
  packs: SessionPack[];
  sessions: Session[];
  goals: ClientGoal[];
  questionnaire: Questionnaire | null;
}) {
  const activePack = packs.find((p) => p.remaining > 0) ?? packs[0] ?? null;
  const lastSession = sessions.find((s) => s.status === "réalisée") ?? null;
  const nextSession = sessions
    .filter((s) => s.status === "planifiée")
    .sort(
      (a, b) =>
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
    )[0] ?? null;
  const activeGoals = goals.filter((g) => g.status === "actif").length;
  const pendingQ = questionnaire?.status === "soumis";

  const stats: { label: string; value: string; sub?: string; alert?: boolean }[] = [
    {
      label: "Séances restantes",
      value: activePack ? `${activePack.remaining}/${activePack.total}` : "—",
      sub: activePack?.offer_label ?? "Pas de pack actif",
      alert: activePack != null && activePack.remaining <= 2,
    },
    {
      label: "Prochaine séance",
      value: nextSession
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
            new Date(nextSession.scheduled_at),
          )
        : "—",
      sub: nextSession ? "Planifiée" : "Aucune prévue",
    },
    {
      label: "Dernier suivi",
      value: lastSession
        ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(
            new Date(lastSession.scheduled_at),
          )
        : "—",
      sub: lastSession ? "Séance réalisée" : "Aucune séance",
    },
    {
      label: "Objectifs actifs",
      value: String(activeGoals),
      sub: pendingQ ? "Questionnaire à lire" : "Aucun questionnaire",
      alert: pendingQ,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-2xl border p-4 ${
            s.alert
              ? "border-amber-300/60 bg-amber-50"
              : "border-taupe-300/40 bg-white"
          }`}
        >
          <p className="text-xs uppercase tracking-wider text-taupe-500">
            {s.label}
          </p>
          <p
            className={`mt-1 font-serif text-2xl ${
              s.alert ? "text-amber-800" : "text-ink-900"
            }`}
          >
            {s.value}
          </p>
          {s.sub && (
            <p className={`mt-0.5 text-xs ${s.alert ? "text-amber-700" : "text-taupe-400"}`}>
              {s.sub}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Utilitaire ─────────────────────────────────────────────────

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <h3 className="mb-4 font-serif text-lg text-ink-900">{title}</h3>
      {children}
    </div>
  );
}
