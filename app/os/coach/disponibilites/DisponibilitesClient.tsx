"use client";

import { useState, useTransition } from "react";
import type { AvailabilityRule, BookingSettings, Unavailability } from "@/lib/booking/types";

// ── Constants ──────────────────────────────────────────────────────────────

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
// Mon–Sun display order (1,2,3,4,5,6,0)
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const TIMEZONES = [
  "Europe/Paris",
  "Europe/London",
  "Europe/Brussels",
  "Europe/Zurich",
  "America/Montreal",
  "America/New_York",
  "America/Los_Angeles",
  "Pacific/Tahiti",
  "Indian/Reunion",
];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(t: string) {
  return t.slice(0, 5);
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtDateShort(iso: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function localDateToUTC(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

// ── Shared UI ──────────────────────────────────────────────────────────────

const inputCls =
  "w-full rounded-xl border border-taupe-300/50 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/20";

const btnPrimary =
  "rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800 disabled:opacity-50 disabled:cursor-not-allowed";

const btnSecondary =
  "rounded-xl border border-taupe-300/50 px-4 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-50";

const btnDanger =
  "rounded-lg px-2.5 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 hover:text-red-700";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-taupe-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-taupe-400">{hint}</p>}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
      <div className="border-b border-taupe-200/60 px-6 py-5">
        <h3 className="font-serif text-xl text-ink-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-taupe-500">{subtitle}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DisponibilitesClient({
  initialRules,
  initialUnavailabilities,
  initialSettings,
}: {
  initialRules: AvailabilityRule[];
  initialUnavailabilities: Unavailability[];
  initialSettings: BookingSettings;
}) {
  const [rules, setRules] = useState<AvailabilityRule[]>(initialRules);
  const [unavailabilities, setUnavailabilities] = useState<Unavailability[]>(initialUnavailabilities);
  const [settings, setSettings] = useState<BookingSettings>(initialSettings);

  return (
    <div className="space-y-6">
      <HorairesSection rules={rules} setRules={setRules} settings={settings} />
      <AbsencesSection unavailabilities={unavailabilities} setUnavailabilities={setUnavailabilities} />
      <ParametresSection settings={settings} setSettings={setSettings} />
    </div>
  );
}

// ── Horaires habituels ─────────────────────────────────────────────────────

function HorairesSection({
  rules,
  setRules,
  settings,
}: {
  rules: AvailabilityRule[];
  setRules: (r: AvailabilityRule[]) => void;
  settings: BookingSettings;
}) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state for new rule
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [newDuration, setNewDuration] = useState(settings.slot_duration_min);

  function rulesForDay(day: number) {
    return rules.filter((r) => r.day_of_week === day).sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );
  }

  function openAddForm(day: number) {
    setAddingDay(day);
    setNewStart("09:00");
    setNewEnd("17:00");
    setNewDuration(settings.slot_duration_min);
    setError(null);
  }

  function handleAdd(day: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day_of_week: day,
          start_time: newStart,
          end_time: newEnd,
          slot_duration_min: newDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'ajout.");
        return;
      }
      setRules([...rules, data.rule]);
      setAddingDay(null);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/booking/availability?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setRules(rules.filter((r) => r.id !== id));
    });
  }

  return (
    <SectionCard
      title="Horaires habituels"
      subtitle="Définissez les plages de disponibilité par jour de la semaine."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DAY_ORDER.map((day) => {
          const dayRules = rulesForDay(day);
          const isAdding = addingDay === day;

          return (
            <div
              key={day}
              className="rounded-xl border border-taupe-200/60 bg-sand-50/40 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink-900">{DAY_LABELS[day]}</p>
                {!isAdding && (
                  <button
                    onClick={() => openAddForm(day)}
                    disabled={isPending}
                    className="flex h-6 w-6 items-center justify-center rounded-full border border-taupe-300/50 text-xs text-taupe-500 transition-colors hover:border-ink-900 hover:text-ink-900"
                    title="Ajouter une plage"
                  >
                    +
                  </button>
                )}
              </div>

              {dayRules.length === 0 && !isAdding && (
                <p className="text-xs text-taupe-400">Aucune plage</p>
              )}

              <div className="space-y-1.5">
                {dayRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between rounded-lg border border-taupe-200/40 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-ink-900">
                        {fmtTime(rule.start_time)} – {fmtTime(rule.end_time)}
                      </p>
                      <p className="text-[10px] text-taupe-400">
                        Créneaux {rule.slot_duration_min} min
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      disabled={isPending}
                      className={btnDanger}
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {isAdding && (
                <div className="mt-2 space-y-2 rounded-xl border border-taupe-300/50 bg-white p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-taupe-400">
                        Début
                      </label>
                      <input
                        type="time"
                        value={newStart}
                        onChange={(e) => setNewStart(e.target.value)}
                        className="w-full rounded-lg border border-taupe-300/50 bg-sand-50 px-2 py-1.5 text-xs text-ink-900 focus:border-taupe-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] uppercase tracking-wider text-taupe-400">
                        Fin
                      </label>
                      <input
                        type="time"
                        value={newEnd}
                        onChange={(e) => setNewEnd(e.target.value)}
                        className="w-full rounded-lg border border-taupe-300/50 bg-sand-50 px-2 py-1.5 text-xs text-ink-900 focus:border-taupe-600 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-taupe-400">
                      Durée créneau
                    </label>
                    <select
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-taupe-300/50 bg-sand-50 px-2 py-1.5 text-xs text-ink-900 focus:border-taupe-600 focus:outline-none"
                    >
                      {[30, 45, 60, 90, 120].map((d) => (
                        <option key={d} value={d}>
                          {d} min
                        </option>
                      ))}
                    </select>
                  </div>
                  {error && <p className="text-[10px] text-red-600">{error}</p>}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setAddingDay(null)}
                      className="flex-1 rounded-lg border border-taupe-300/40 py-1.5 text-xs text-taupe-600 transition-colors hover:bg-sand-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => handleAdd(day)}
                      disabled={isPending}
                      className="flex-1 rounded-lg bg-ink-900 py-1.5 text-xs font-medium text-sand-50 transition-colors hover:bg-taupe-800 disabled:opacity-50"
                    >
                      {isPending ? "…" : "Ajouter"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-taupe-100 bg-sand-50/60 px-4 py-3">
        <p className="text-xs text-taupe-500">
          Les créneaux sont générés automatiquement dans ces plages horaires.
          Les absences ponctuelles définies ci-dessous prennent la priorité.
        </p>
      </div>
    </SectionCard>
  );
}

// ── Absences & indisponibilités ────────────────────────────────────────────

function AbsencesSection({
  unavailabilities,
  setUnavailabilities,
}: {
  unavailabilities: Unavailability[];
  setUnavailabilities: (u: Unavailability[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [label, setLabel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("00:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("23:59");
  const [isAllDay, setIsAllDay] = useState(true);

  function resetForm() {
    setLabel("");
    setStartDate("");
    setStartTime("00:00");
    setEndDate("");
    setEndTime("23:59");
    setIsAllDay(true);
    setError(null);
  }

  function handleAdd() {
    if (!startDate || !endDate) {
      setError("Dates requises.");
      return;
    }
    setError(null);

    const startsAt = isAllDay
      ? localDateToUTC(startDate, "00:00")
      : localDateToUTC(startDate, startTime);
    const endsAt = isAllDay
      ? localDateToUTC(endDate, "23:59")
      : localDateToUTC(endDate, endTime);

    startTransition(async () => {
      const res = await fetch("/api/booking/unavailabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          starts_at: startsAt,
          ends_at: endsAt,
          label: label || null,
          is_all_day: isAllDay,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de l'ajout.");
        return;
      }
      setUnavailabilities([...unavailabilities, data.unavailability]);
      resetForm();
      setShowForm(false);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/booking/unavailabilities?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      setUnavailabilities(unavailabilities.filter((u) => u.id !== id));
    });
  }

  return (
    <SectionCard
      title="Absences & indisponibilités"
      subtitle="Bloquez des périodes spécifiques (congés, formations, etc.)."
    >
      {unavailabilities.length === 0 && !showForm && (
        <p className="mb-4 text-sm text-taupe-400">Aucune absence planifiée.</p>
      )}

      {unavailabilities.length > 0 && (
        <div className="mb-4 space-y-2">
          {unavailabilities.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-xl border border-taupe-200/50 bg-sand-50/40 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {u.label ?? "Indisponibilité"}
                </p>
                <p className="mt-0.5 text-xs text-taupe-500">
                  {u.is_all_day
                    ? `${fmtDate(u.starts_at)} – ${fmtDate(u.ends_at)}`
                    : `${fmtDateShort(u.starts_at)} ${new Date(u.starts_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} → ${fmtDateShort(u.ends_at)} ${new Date(u.ends_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(u.id)}
                disabled={isPending}
                className={btnDanger}
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-4 rounded-2xl border border-taupe-300/50 bg-sand-50/40 p-5">
          <Field label="Motif (optionnel)">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Congés, formation, fermeture…"
              className={inputCls}
            />
          </Field>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-900">
              <div
                onClick={() => setIsAllDay(!isAllDay)}
                className={`relative h-5 w-9 rounded-full transition-colors ${isAllDay ? "bg-ink-900" : "bg-taupe-300"}`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isAllDay ? "translate-x-4" : "translate-x-0.5"}`}
                />
              </div>
              Journée entière
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de début">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Date de fin">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
          </div>

          {!isAllDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Heure de début">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Heure de fin">
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className={btnSecondary}
            >
              Annuler
            </button>
            <button
              onClick={handleAdd}
              disabled={isPending || !startDate || !endDate}
              className={btnPrimary}
            >
              {isPending ? "Ajout…" : "Ajouter l'absence"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-taupe-300/50 px-4 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
        >
          + Ajouter une absence
        </button>
      )}
    </SectionCard>
  );
}

// ── Paramètres de réservation ──────────────────────────────────────────────

function ParametresSection({
  settings,
  setSettings,
}: {
  settings: BookingSettings;
  setSettings: (s: BookingSettings) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    min_notice_hours: settings.min_notice_hours,
    max_advance_days: settings.max_advance_days,
    slot_duration_min: settings.slot_duration_min,
    buffer_after_min: settings.buffer_after_min,
    auto_confirm: settings.auto_confirm,
    timezone: settings.timezone,
  });

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await fetch("/api/booking/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la sauvegarde.");
        return;
      }
      setSettings(data.settings);
      setSaved(true);
    });
  }

  return (
    <SectionCard
      title="Paramètres de réservation"
      subtitle="Ces paramètres s'appliquent à tous vos créneaux de réservation."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Préavis minimum (heures)"
          hint="Délai minimum avant une réservation."
        >
          <input
            type="number"
            min={0}
            max={168}
            value={form.min_notice_hours}
            onChange={(e) => patch("min_notice_hours", Number(e.target.value))}
            className={inputCls}
          />
        </Field>

        <Field
          label="Réservation max à l'avance (jours)"
          hint="Fenêtre maximale de réservation."
        >
          <input
            type="number"
            min={1}
            max={365}
            value={form.max_advance_days}
            onChange={(e) => patch("max_advance_days", Number(e.target.value))}
            className={inputCls}
          />
        </Field>

        <Field label="Durée des créneaux" hint="Durée par défaut d'un créneau.">
          <select
            value={form.slot_duration_min}
            onChange={(e) => patch("slot_duration_min", Number(e.target.value))}
            className={inputCls}
          >
            {[30, 45, 60, 75, 90, 120].map((d) => (
              <option key={d} value={d}>
                {d} min
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Tampon après créneau (minutes)"
          hint="Pause entre deux réservations."
        >
          <select
            value={form.buffer_after_min}
            onChange={(e) => patch("buffer_after_min", Number(e.target.value))}
            className={inputCls}
          >
            {[0, 5, 10, 15, 30].map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Aucun" : `${d} min`}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Fuseau horaire">
          <select
            value={form.timezone}
            onChange={(e) => patch("timezone", e.target.value)}
            className={inputCls}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Confirmation automatique" hint="Confirme instantanément les nouvelles réservations.">
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => patch("auto_confirm", !form.auto_confirm)}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.auto_confirm ? "bg-ink-900" : "bg-taupe-300"}`}
            >
              <div
                className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.auto_confirm ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
            <span className="text-sm text-taupe-600">
              {form.auto_confirm ? "Activée" : "Désactivée (validation manuelle)"}
            </span>
          </div>
        </Field>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-6 flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending}
          className={btnPrimary}
        >
          {isPending ? "Enregistrement…" : "Enregistrer les paramètres"}
        </button>
        {saved && (
          <p className="text-sm text-emerald-600">Paramètres enregistrés.</p>
        )}
      </div>
    </SectionCard>
  );
}

// Keep DAY_SHORT exported for future use
export { DAY_SHORT };
