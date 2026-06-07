"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TimeSlot } from "@/lib/booking/types";
import type { Offer } from "@/lib/content/offers";

// ── Types ──────────────────────────────────────────────────────────────────

type Step = "calendar" | "form" | "submitting";

type MonthKey = string; // "YYYY-MM"

// ── Helpers ────────────────────────────────────────────────────────────────

function toLocalDateStr(iso: string): string {
  // Returns "YYYY-MM-DD" in browser local timezone
  return new Date(iso).toLocaleDateString("sv");
}

function toMonthKey(coachId: string, offerId: string, year: number, month: number): MonthKey {
  return `${coachId}-${offerId}-${year}-${String(month + 1).padStart(2, "0")}`;
}

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  // Week starts Monday: Sun=0 → 6, Mon=1 → 0, …
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
}

function fmtDayFull(dateStr: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  }).format(new Date(dateStr + "T12:00:00Z"));
}

function fmtMonthYear(year: number, month: number): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
}

const DAY_SHORT = ["L", "M", "M", "J", "V", "S", "D"];

// ── Component ──────────────────────────────────────────────────────────────

type Props = {
  coachId: string; // Supabase UUID (osProfileId)
  coachSlug: string; // eg "dorian" — used in confirmation URL
  coachName: string;
  offer: Offer;
  sumupUrl: string | null;
  onBack: () => void;
};

export function NativeSlotPicker({ coachId, coachSlug, coachName, offer, sumupUrl, onBack }: Props) {
  const router = useRouter();

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  // slot cache: monthKey → available slots
  const [slotCache, setSlotCache] = useState<Record<MonthKey, TimeSlot[]>>({});
  const [loadingMonths, setLoadingMonths] = useState<Set<MonthKey>>(new Set());
  const [errorMonths, setErrorMonths] = useState<Set<MonthKey>>(new Set());
  // null = not yet fetched, true/false = known after first fetch
  const [coachHasRules, setCoachHasRules] = useState<boolean | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null); // "YYYY-MM-DD"
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [step, setStep] = useState<Step>("calendar");

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cabinet">(
    sumupUrl ? "online" : "cabinet",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Fetch slots ──────────────────────────────────────────────────────────

  const fetchMonth = useCallback(
    async (year: number, month: number) => {
      const key = toMonthKey(coachId, offer.id, year, month);
      if (slotCache[key] !== undefined || loadingMonths.has(key)) return;

      setLoadingMonths((prev) => new Set(prev).add(key));
      setErrorMonths((prev) => { const s = new Set(prev); s.delete(key); return s; });

      const { from, to } = getMonthRange(year, month);
      try {
        const res = await fetch(
          `/api/booking/slots?coach_id=${encodeURIComponent(coachId)}&from=${from}&to=${to}`,
        );
        if (!res.ok) throw new Error("fetch failed");
        const data: { slots: TimeSlot[]; has_rules: boolean } = await res.json();
        const available = data.slots.filter((s) => s.available);
        setCoachHasRules(data.has_rules);
        setSlotCache((prev) => ({ ...prev, [key]: available }));
      } catch {
        setErrorMonths((prev) => new Set(prev).add(key));
      } finally {
        setLoadingMonths((prev) => { const s = new Set(prev); s.delete(key); return s; });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coachId, offer.id],
  );

  useEffect(() => {
    fetchMonth(viewYear, viewMonth);
    // Prefetch next month
    const nextDate = new Date(viewYear, viewMonth + 1, 1);
    fetchMonth(nextDate.getFullYear(), nextDate.getMonth());
  }, [viewYear, viewMonth, fetchMonth]);

  // Reset all state when coach or offer changes
  useEffect(() => {
    setSlotCache({});
    setLoadingMonths(new Set());
    setErrorMonths(new Set());
    setCoachHasRules(null);
    setSelectedDay(null);
    setSelectedSlot(null);
    setStep("calendar");
    setFormError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachId, offer.id]);

  // ── Derived slot data ────────────────────────────────────────────────────

  const currentKey = toMonthKey(coachId, offer.id, viewYear, viewMonth);
  const currentMonthSlots = slotCache[currentKey] ?? [];
  const isLoading = loadingMonths.has(currentKey);
  const hasError = errorMonths.has(currentKey);

  // Map day string → slots
  const slotsByDay: Record<string, TimeSlot[]> = {};
  for (const slot of currentMonthSlots) {
    const day = toLocalDateStr(slot.starts_at);
    if (!slotsByDay[day]) slotsByDay[day] = [];
    slotsByDay[day].push(slot);
  }

  const selectedDaySlots = selectedDay ? (slotsByDay[selectedDay] ?? []) : [];

  // ── Navigation ───────────────────────────────────────────────────────────

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelectedDay(null);
    setSelectedSlot(null);
  }

  const todayISO = now.toLocaleDateString("sv");
  const isPastMonth =
    viewYear < now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth < now.getMonth());

  // ── Booking submit ───────────────────────────────────────────────────────

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setFormError(null);

    const durationMin = Math.round(
      (new Date(selectedSlot.ends_at).getTime() - new Date(selectedSlot.starts_at).getTime()) / 60000,
    );

    startTransition(async () => {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coach_id: coachId,
          offer_id: offer.id,
          starts_at: selectedSlot.starts_at,
          ends_at: selectedSlot.ends_at,
          duration_min: durationMin,
          client_name: clientName.trim(),
          client_email: clientEmail.trim().toLowerCase(),
          client_phone: clientPhone.trim() || null,
          client_notes: clientNotes.trim() || null,
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setFormError("Ce créneau vient d'être réservé. Veuillez en choisir un autre.");
          setStep("calendar");
          setSelectedSlot(null);
          // Invalidate cache for this month so slots refresh
          setSlotCache((prev) => {
            const next = { ...prev };
            delete next[currentKey];
            return next;
          });
        } else {
          setFormError(data.error ?? "Une erreur est survenue. Veuillez réessayer.");
        }
        return;
      }

      // Success — redirect to confirmation
      const p = new URLSearchParams();
      p.set("coach", coachSlug); // slug eg "dorian", matched by confirmation page
      p.set("offre", offer.id);
      p.set("startTime", selectedSlot.starts_at);
      p.set("name", clientName.trim());
      p.set("payment", paymentMethod); // "online" | "cabinet"
      router.push(`/reservation/confirmation?${p.toString()}`);
    });
  }

  // ── Render calendar ──────────────────────────────────────────────────────

  if (step === "form") {
    return (
      <BookingForm
        slot={selectedSlot!}
        coachName={coachName}
        offerName={offer.name}
        clientName={clientName}
        setClientName={setClientName}
        clientEmail={clientEmail}
        setClientEmail={setClientEmail}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        clientNotes={clientNotes}
        setClientNotes={setClientNotes}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        sumupUrl={sumupUrl}
        isPending={isPending}
        error={formError}
        onBack={() => { setStep("calendar"); setFormError(null); }}
        onSubmit={handleSubmit}
      />
    );
  }

  const calDays = getCalendarDays(viewYear, viewMonth);

  return (
    <div className="mt-6 space-y-4">
      {/* Notice préavis */}
      <div className="flex items-start gap-3 rounded-xl border border-taupe-300/40 bg-sand-100/60 px-4 py-3 text-xs text-taupe-600">
        <span className="mt-px shrink-0 text-taupe-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        <span>
          Les créneaux proposés respectent le préavis minimum de 24h.
          Seuls les créneaux <strong className="font-semibold text-taupe-700">disponibles</strong> sont cliquables.
        </span>
      </div>

      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>⚠ {formError}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
        {/* Month header */}
        <div className="flex items-center justify-between border-b border-taupe-200/60 px-5 py-4">
          <button
            onClick={prevMonth}
            disabled={isPastMonth}
            aria-label="Mois précédent"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-taupe-300/40 text-lg text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹
          </button>
          <p className="font-serif text-base capitalize text-ink-900">
            {fmtMonthYear(viewYear, viewMonth)}
          </p>
          <button
            onClick={nextMonth}
            aria-label="Mois suivant"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-taupe-300/40 text-lg text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            ›
          </button>
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-taupe-100 bg-sand-50/60 px-2 py-2">
          {DAY_SHORT.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-medium uppercase tracking-widest text-taupe-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-px p-2">
            {Array.from({ length: 35 }, (_, i) => (
              <div key={i} className="mx-auto h-9 w-9 animate-pulse rounded-full bg-taupe-100/60" />
            ))}
          </div>
        ) : hasError ? (
          <div className="p-6 text-center">
            <p className="text-sm text-taupe-500">Impossible de charger les créneaux.</p>
            <button
              onClick={() => {
                setErrorMonths((prev) => { const s = new Set(prev); s.delete(currentKey); return s; });
                fetchMonth(viewYear, viewMonth);
              }}
              className="mt-3 rounded-lg border border-taupe-300/40 px-4 py-2 text-xs text-taupe-600 hover:bg-sand-50"
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px p-2">
            {calDays.map((day, i) => {
              if (!day) return <div key={i} />;
              const dayStr = day.toLocaleDateString("sv");
              const hasSlots = Boolean(slotsByDay[dayStr]?.length);
              const isPast = dayStr < todayISO;
              const isSelected = selectedDay === dayStr;
              const isCurrentDay = dayStr === todayISO;

              return (
                <div key={i} className="flex items-center justify-center py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isPast || !hasSlots) return;
                      setSelectedDay(dayStr);
                      setSelectedSlot(null);
                    }}
                    disabled={isPast || !hasSlots}
                    className={`relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm transition-all
                      ${isSelected ? "bg-taupe-700 font-semibold text-sand-50 shadow-sm" : ""}
                      ${!isSelected && isCurrentDay ? "border border-taupe-600 font-semibold text-ink-900" : ""}
                      ${!isSelected && !isCurrentDay && hasSlots && !isPast ? "text-ink-900 hover:bg-sand-100" : ""}
                      ${isPast || !hasSlots ? "cursor-default text-taupe-300" : "cursor-pointer"}
                    `}
                  >
                    {day.getDate()}
                    {hasSlots && !isPast && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-taupe-500" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Time slots for selected day */}
        {selectedDay && (
          <div className="border-t border-taupe-100 bg-sand-50/40 px-5 py-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-taupe-500">
              {fmtDayFull(selectedDay)}
            </p>
            {selectedDaySlots.length === 0 ? (
              <p className="text-sm text-taupe-400">Aucun créneau disponible ce jour.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedDaySlots.map((slot) => {
                  const isChosen = selectedSlot?.starts_at === slot.starts_at;
                  return (
                    <button
                      key={slot.starts_at}
                      type="button"
                      onClick={() => setSelectedSlot(isChosen ? null : slot)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                        isChosen
                          ? "border-taupe-700 bg-taupe-700 text-sand-50 shadow-sm"
                          : "border-taupe-300/50 bg-white text-ink-900 hover:border-taupe-600 hover:bg-sand-50"
                      }`}
                    >
                      {fmtTime(slot.starts_at)}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSlot && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-taupe-200/60 bg-white px-4 py-3">
                <div>
                  <p className="text-xs text-taupe-500">Créneau sélectionné</p>
                  <p className="mt-0.5 font-serif text-base text-ink-900">
                    {fmtDayFull(selectedDay)} à {fmtTime(selectedSlot.starts_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="inline-flex items-center gap-2 rounded-xl bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800"
                >
                  Confirmer →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !hasError && currentMonthSlots.length === 0 && (
          <div className="border-t border-taupe-100 px-5 py-8 text-center">
            {coachHasRules === false ? (
              <>
                <p className="font-serif text-base text-ink-900">Aucun créneau disponible pour ce coach actuellement</p>
                <p className="mt-1 text-sm text-taupe-500">
                  Ce coach n&apos;a pas encore configuré ses disponibilités.
                </p>
                <div className="mt-4">
                  <a
                    href="/contact"
                    className="rounded-xl bg-taupe-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-taupe-800 transition-colors"
                  >
                    Contacter le cabinet
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="font-serif text-base text-ink-900">Aucun créneau disponible ce mois-ci</p>
                <p className="mt-1 text-sm text-taupe-500">
                  Les disponibilités sont mises à jour régulièrement.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={nextMonth}
                    className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm text-taupe-600 hover:bg-sand-50 hover:text-ink-900 transition-colors"
                  >
                    Mois suivant →
                  </button>
                  <a
                    href="/contact"
                    className="rounded-xl bg-taupe-700 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-taupe-800 transition-colors"
                  >
                    Contacter le cabinet
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Booking form ───────────────────────────────────────────────────────────

function BookingForm({
  slot,
  coachName,
  offerName,
  clientName,
  setClientName,
  clientEmail,
  setClientEmail,
  clientPhone,
  setClientPhone,
  clientNotes,
  setClientNotes,
  paymentMethod,
  setPaymentMethod,
  sumupUrl,
  isPending,
  error,
  onBack,
  onSubmit,
}: {
  slot: TimeSlot;
  coachName: string;
  offerName: string;
  clientName: string;
  setClientName: (v: string) => void;
  clientEmail: string;
  setClientEmail: (v: string) => void;
  clientPhone: string;
  setClientPhone: (v: string) => void;
  clientNotes: string;
  setClientNotes: (v: string) => void;
  paymentMethod: "online" | "cabinet";
  setPaymentMethod: (v: "online" | "cabinet") => void;
  sumupUrl: string | null;
  isPending: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const formattedSlot = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(slot.starts_at));

  return (
    <div className="mt-6 space-y-4">
      {/* Récap créneau */}
      <div className="flex items-center justify-between rounded-xl border border-taupe-200/60 bg-sand-50/60 px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-taupe-400">Votre créneau</p>
          <p className="mt-0.5 font-serif text-base capitalize text-ink-900">{formattedSlot}</p>
          <p className="mt-0.5 text-xs text-taupe-500">{coachName} · {offerName}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-taupe-300/40 px-3 py-1.5 text-xs text-taupe-600 transition-colors hover:bg-white hover:text-ink-900"
        >
          ← Modifier
        </button>
      </div>

      <form onSubmit={onSubmit} className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
        <div className="border-b border-taupe-200/60 px-6 py-4">
          <h3 className="font-serif text-xl text-ink-900">Vos informations</h3>
          <p className="mt-1 text-sm text-taupe-500">Renseignez vos coordonnées pour finaliser la réservation.</p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <FormField label="Nom complet *">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              minLength={2}
              placeholder="Prénom Nom"
              className={inputCls}
              autoComplete="name"
            />
          </FormField>

          <FormField label="Adresse e-mail *">
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              required
              placeholder="vous@exemple.fr"
              className={inputCls}
              autoComplete="email"
            />
          </FormField>

          <FormField label="Téléphone (optionnel)">
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="06 00 00 00 00"
              className={inputCls}
              autoComplete="tel"
            />
          </FormField>

          <FormField label="Message pour le coach (optionnel)">
            <textarea
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Objectifs, blessures passées, attentes particulières…"
              className={`${inputCls} resize-none`}
            />
          </FormField>

          {/* Mode de règlement */}
          <FormField label="Mode de règlement">
            <div className="flex gap-3">
              {sumupUrl && (
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-all ${
                    paymentMethod === "online"
                      ? "border-taupe-700 bg-taupe-700 text-sand-50"
                      : "border-taupe-300/50 bg-white text-ink-900 hover:border-taupe-500"
                  }`}
                >
                  En ligne
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentMethod("cabinet")}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium transition-all ${
                  paymentMethod === "cabinet"
                    ? "border-taupe-700 bg-taupe-700 text-sand-50"
                    : "border-taupe-300/50 bg-white text-ink-900 hover:border-taupe-500"
                }`}
              >
                Au cabinet
              </button>
            </div>
          </FormField>

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <span className="shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onBack} className={btnSecondary}>
              ← Retour
            </button>
            <button
              type="submit"
              disabled={isPending || !clientName.trim() || !clientEmail.trim()}
              className={btnPrimary}
            >
              {isPending ? "Confirmation…" : "Confirmer la réservation →"}
            </button>
          </div>

          <p className="text-xs text-taupe-400">
            En confirmant, vous acceptez les{" "}
            <a href="/mentions-legales" className="underline hover:text-ink-900">
              conditions générales
            </a>{" "}
            du cabinet. Vous recevrez un e-mail de confirmation.
          </p>
        </div>
      </form>
    </div>
  );
}

// ── Shared UI ──────────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wider text-taupe-500">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-taupe-300/50 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/20";

const btnPrimary =
  "flex-1 rounded-xl bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800 disabled:opacity-50 disabled:cursor-not-allowed";

const btnSecondary =
  "rounded-xl border border-taupe-300/50 px-4 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-50";
