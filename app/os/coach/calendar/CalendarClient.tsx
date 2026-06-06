"use client";

import { useState, useTransition, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Profile } from "@/lib/os/types";
import type { SessionStatus } from "@/lib/os/types";
import type { SessionWithClient } from "@/lib/supabase/os-server";
import type { Booking } from "@/lib/booking/types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  createCalendarSessionAction,
  updateCalendarSessionAction,
  moveSessionAction,
  deleteSessionAction,
} from "./actions";

// ── Constants ──────────────────────────────────────────────────────────────

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_PX = 64;
const HOURS = END_HOUR - START_HOUR;
const TOTAL_PX = HOURS * HOUR_PX;
const SNAP_MIN = 30;

const STATUS_CFG: Record<
  string,
  { card: string; badge: string; dot: string; label: string }
> = {
  planifiée: {
    card: "bg-ink-900 border-ink-800/80 text-sand-50",
    badge: "bg-ink-900/10 text-ink-900 border-ink-900/20",
    dot: "bg-blue-400",
    label: "Planifiée",
  },
  réalisée: {
    card: "bg-emerald-800 border-emerald-700 text-white",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Réalisée",
  },
  annulée: {
    card: "bg-red-50 border-red-200 text-red-700",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
    label: "Annulée",
  },
  no_show: {
    card: "bg-taupe-200 border-taupe-300 text-taupe-600",
    badge: "bg-taupe-100 text-taupe-600 border-taupe-200",
    dot: "bg-taupe-400",
    label: "No show",
  },
};

const BOOKING_STATUS_CFG: Record<
  string,
  { card: string; dot: string; label: string }
> = {
  confirmed: {
    card: "bg-blue-600 border-blue-500 text-white",
    dot: "bg-blue-300",
    label: "Confirmée",
  },
  pending: {
    card: "bg-amber-500 border-amber-400 text-white",
    dot: "bg-amber-200",
    label: "En attente",
  },
  completed: {
    card: "bg-emerald-700 border-emerald-600 text-white",
    dot: "bg-emerald-300",
    label: "Terminée",
  },
  cancelled_by_client: {
    card: "bg-red-50 border-red-200 text-red-700",
    dot: "bg-red-400",
    label: "Annulée (client)",
  },
  cancelled_by_coach: {
    card: "bg-red-50 border-red-200 text-red-700",
    dot: "bg-red-400",
    label: "Annulée (coach)",
  },
  no_show: {
    card: "bg-taupe-200 border-taupe-300 text-taupe-600",
    dot: "bg-taupe-400",
    label: "No show",
  },
};

const STATUSES = Object.keys(STATUS_CFG) as SessionStatus[];
const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ── Helpers ────────────────────────────────────────────────────────────────

function getWeekDays(weekStartISO: string): Date[] {
  const [y, m, d] = weekStartISO.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i));
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return toISO(d);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function sessionTopPx(s: SessionWithClient): number {
  const d = new Date(s.scheduled_at);
  return Math.max(0, (d.getHours() - START_HOUR) * HOUR_PX + (d.getMinutes() / 60) * HOUR_PX);
}

function sessionHeightPx(s: SessionWithClient): number {
  return Math.max(HOUR_PX / 4, (s.duration_min / 60) * HOUR_PX);
}

function bookingTopPx(b: Booking): number {
  const d = new Date(b.starts_at);
  return Math.max(0, (d.getHours() - START_HOUR) * HOUR_PX + (d.getMinutes() / 60) * HOUR_PX);
}

function bookingHeightPx(b: Booking): number {
  return Math.max(HOUR_PX / 4, (b.duration_min / 60) * HOUR_PX);
}

function toDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function formatWeekRange(days: Date[]): string {
  const start = days[0];
  const end = days[6];
  const fmtMY = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
  const fmtDM = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${fmtMY.format(end)}`;
  }
  return `${fmtDM.format(start)} – ${fmtDM.format(end)} ${end.getFullYear()}`;
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function fmtFull(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function checkConflict(
  sessions: SessionWithClient[],
  scheduledAt: Date,
  durationMin: number,
  excludeId?: string,
): boolean {
  const nStart = scheduledAt.getTime();
  const nEnd = nStart + durationMin * 60_000;
  return sessions.some((s) => {
    if (s.id === excludeId) return false;
    if (s.status === "annulée" || s.status === "no_show") return false;
    const sStart = new Date(s.scheduled_at).getTime();
    const sEnd = sStart + s.duration_min * 60_000;
    return nStart < sEnd && nEnd > sStart;
  });
}

// ── Types ──────────────────────────────────────────────────────────────────

type DropSlot = { day: Date; hour: number; minute: number };
type CreateSlot = { date: Date; hour: number; minute: number };
type BookingDetail = Booking & { _type: "booking" };

// ── Motion config ──────────────────────────────────────────────────────────

const OVERLAY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
};

const CARD_SPRING = {
  initial: { opacity: 0, y: 28, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 14, scale: 0.98 },
  transition: { type: "spring" as const, damping: 30, stiffness: 380, mass: 0.75 },
};

// ── Main Component ─────────────────────────────────────────────────────────

export function CalendarClient({
  sessions,
  clients,
  weekStartISO,
  nativeBookings = [],
}: {
  sessions: SessionWithClient[];
  clients: Profile[];
  weekStartISO: string;
  nativeBookings?: Booking[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = getWeekDays(weekStartISO);

  const [view, setView] = useState<"week" | "day">("week");
  const [selectedDay, setSelectedDay] = useState<Date>(
    days.find(isToday) ?? days[0],
  );
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropSlot | null>(null);
  const [createSlot, setCreateSlot] = useState<CreateSlot | null>(null);
  const [detailSession, setDetailSession] = useState<SessionWithClient | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Live bookings state (updated via Realtime)
  const [liveBookings, setLiveBookings] = useState<Booking[]>(nativeBookings);

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel("calendar-bookings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          // On any change, refresh the page data
          if (mounted) router.refresh();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [router]);

  // Sync when server re-renders (router.refresh)
  useEffect(() => {
    setLiveBookings(nativeBookings);
  }, [nativeBookings]);

  const displayDays = view === "week" ? days : [selectedDay];
  const cols = displayDays.length;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = (8 - START_HOUR) * HOUR_PX;
    }
  }, []);

  const sessionsForDay = useCallback(
    (day: Date) =>
      sessions.filter((s) => isSameDay(new Date(s.scheduled_at), day)),
    [sessions],
  );

  const bookingsForDay = useCallback(
    (day: Date) =>
      liveBookings.filter(
        (b) =>
          isSameDay(new Date(b.starts_at), day) &&
          b.status !== "cancelled_by_client" &&
          b.status !== "cancelled_by_coach",
      ),
    [liveBookings],
  );

  // ── Navigation ─────────────────────────────────────────────────────────

  function navigateWeek(delta: number) {
    const newDate = addDays(days[0], delta * 7);
    router.push(`?week=${toISO(newDate)}`);
  }

  function goToday() {
    router.push(`?week=${getMondayISO(new Date())}`);
    setSelectedDay(new Date());
    setView("week");
  }

  function selectDay(d: Date) {
    setSelectedDay(d);
    setView("day");
  }

  // ── Drag & drop ────────────────────────────────────────────────────────

  function onDragStart(id: string) {
    setDraggedId(id);
  }

  function onDragEnd() {
    setDraggedId(null);
    setDropTarget(null);
  }

  function onDragOver(e: React.DragEvent, slot: DropSlot) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (
      !dropTarget ||
      !isSameDay(dropTarget.day, slot.day) ||
      dropTarget.hour !== slot.hour ||
      dropTarget.minute !== slot.minute
    ) {
      setDropTarget(slot);
    }
  }

  function onDrop(e: React.DragEvent, slot: DropSlot) {
    e.preventDefault();
    if (!draggedId) return;
    const d = new Date(slot.day);
    d.setHours(slot.hour, slot.minute, 0, 0);
    startTransition(async () => {
      await moveSessionAction(draggedId, d.toISOString());
      router.refresh();
    });
    setDraggedId(null);
    setDropTarget(null);
  }

  // ── Grid ───────────────────────────────────────────────────────────────

  const snapSlots = Array.from({ length: HOURS * 2 }, (_, i) => ({
    i,
    hour: START_HOUR + Math.floor(i / 2),
    minute: (i % 2) * SNAP_MIN,
    top: i * (HOUR_PX / 2),
  }));

  const gridCols = `4rem repeat(${cols}, 1fr)`;
  const minW = cols === 7 ? "600px" : "260px";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-taupe-200/60 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigateWeek(-1)}
            aria-label="Semaine précédente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-taupe-300/40 text-lg text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            ‹
          </button>
          <span className="min-w-[180px] px-2 text-center font-serif text-base text-ink-900">
            {formatWeekRange(days)}
          </span>
          <button
            onClick={() => navigateWeek(1)}
            aria-label="Semaine suivante"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-taupe-300/40 text-lg text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isPending && (
            <span className="text-xs text-taupe-400">Mise à jour…</span>
          )}
          <button
            onClick={goToday}
            className="rounded-lg border border-taupe-300/40 px-3 py-1.5 text-sm text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            Aujourd&apos;hui
          </button>
          <div className="flex overflow-hidden rounded-lg border border-taupe-300/40">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-sm transition-colors ${
                view === "week"
                  ? "bg-ink-900 text-sand-50"
                  : "text-taupe-600 hover:bg-sand-50"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView("day")}
              className={`border-l border-taupe-300/40 px-3 py-1.5 text-sm transition-colors ${
                view === "day"
                  ? "bg-ink-900 text-sand-50"
                  : "text-taupe-600 hover:bg-sand-50"
              }`}
            >
              Jour
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable area */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: minW }}>
          {/* Day headers */}
          <div
            className="grid border-b border-taupe-200/60 bg-white"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div className="py-2" />
            {displayDays.map((d) => {
              const today = isToday(d);
              const dayIdx = (d.getDay() + 6) % 7;
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => selectDay(d)}
                  className="py-2 text-center transition-colors hover:bg-sand-50"
                >
                  <p
                    className={`text-[10px] uppercase tracking-widest ${
                      today ? "font-bold text-ink-900" : "text-taupe-400"
                    }`}
                  >
                    {DAY_LABELS[dayIdx]}
                  </p>
                  <p
                    className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium ${
                      today ? "bg-ink-900 text-sand-50" : "text-taupe-700"
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Time grid */}
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{ maxHeight: "600px" }}
          >
            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
              {/* Time axis */}
              <div className="relative select-none" style={{ height: TOTAL_PX }}>
                {Array.from({ length: HOURS + 1 }, (_, i) => START_HOUR + i).map(
                  (h) => (
                    <div
                      key={h}
                      className="absolute right-2 text-right text-[10px] text-taupe-400"
                      style={{ top: (h - START_HOUR) * HOUR_PX - 7 }}
                    >
                      {String(h).padStart(2, "0")}:00
                    </div>
                  ),
                )}
              </div>

              {/* Day columns */}
              {displayDays.map((day) => {
                const daySessions = sessionsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-l border-taupe-200/40 ${
                      isToday(day) ? "bg-amber-50/10" : ""
                    }`}
                    style={{ height: TOTAL_PX }}
                  >
                    {/* Hour + half-hour lines */}
                    {Array.from({ length: HOURS }, (_, i) => (
                      <div key={i}>
                        <div
                          className="pointer-events-none absolute w-full border-t border-taupe-200/50"
                          style={{ top: i * HOUR_PX }}
                        />
                        <div
                          className="pointer-events-none absolute w-full border-t border-taupe-100/60"
                          style={{ top: i * HOUR_PX + HOUR_PX / 2 }}
                        />
                      </div>
                    ))}

                    {/* Drop/click slots */}
                    {snapSlots.map((slot) => {
                      const isTarget =
                        !!dropTarget &&
                        isSameDay(dropTarget.day, day) &&
                        dropTarget.hour === slot.hour &&
                        dropTarget.minute === slot.minute;
                      return (
                        <div
                          key={slot.i}
                          className={`absolute w-full transition-colors ${
                            isTarget
                              ? "bg-taupe-200/50"
                              : draggedId
                                ? "hover:bg-taupe-100/30"
                                : "hover:bg-sand-50/70"
                          } ${draggedId ? "cursor-copy" : "cursor-pointer"}`}
                          style={{
                            top: slot.top,
                            height: HOUR_PX / 2,
                            zIndex: 1,
                          }}
                          onDragOver={(e) =>
                            onDragOver(e, { day, hour: slot.hour, minute: slot.minute })
                          }
                          onDrop={(e) =>
                            onDrop(e, { day, hour: slot.hour, minute: slot.minute })
                          }
                          onClick={() => {
                            if (!draggedId) {
                              setCreateSlot({
                                date: day,
                                hour: slot.hour,
                                minute: slot.minute,
                              });
                            }
                          }}
                        />
                      );
                    })}

                    {/* Session cards */}
                    {daySessions.map((s) => {
                      const cfg = STATUS_CFG[s.status] ?? STATUS_CFG.planifiée;
                      const top = sessionTopPx(s);
                      const height = sessionHeightPx(s);
                      const isDragging = draggedId === s.id;

                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={() => onDragStart(s.id)}
                          onDragEnd={onDragEnd}
                          onClick={() => setDetailSession(s)}
                          className={`absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border px-1.5 py-1 transition-all select-none ${cfg.card} ${
                            isDragging
                              ? "cursor-grabbing opacity-40 shadow-none"
                              : "cursor-pointer hover:z-20 hover:shadow-lg hover:-translate-y-px hover:scale-[1.01]"
                          }`}
                          style={{ top, height }}
                          title={`${s.client_display_name} · ${s.duration_min} min · ${cfg.label}`}
                        >
                          <p className="truncate text-[11px] font-semibold leading-tight">
                            {s.client_display_name}
                          </p>
                          {height >= 36 && (
                            <p className="truncate text-[10px] opacity-70">
                              {fmtTime(s.scheduled_at)} · {s.duration_min} min
                            </p>
                          )}
                          {height >= 60 && s.location && (
                            <p className="truncate text-[10px] opacity-60">
                              {s.location}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {/* Native booking cards */}
                    {bookingsForDay(day).map((b) => {
                      const cfg = BOOKING_STATUS_CFG[b.status] ?? BOOKING_STATUS_CFG.confirmed;
                      const top = bookingTopPx(b);
                      const height = bookingHeightPx(b);

                      return (
                        <div
                          key={`booking-${b.id}`}
                          onClick={() => setDetailBooking(b)}
                          className={`absolute left-0.5 right-0.5 z-10 overflow-hidden rounded-lg border px-1.5 py-1 transition-all select-none cursor-pointer hover:z-20 hover:shadow-lg hover:-translate-y-px hover:scale-[1.01] ${cfg.card}`}
                          style={{ top, height, marginLeft: "1px" }}
                          title={`${b.client_name} · ${b.duration_min} min · ${cfg.label}`}
                        >
                          <p className="truncate text-[11px] font-semibold leading-tight">
                            {b.client_name}
                          </p>
                          {height >= 36 && (
                            <p className="truncate text-[10px] opacity-70">
                              {fmtTime(b.starts_at)} · {b.duration_min} min
                            </p>
                          )}
                          {height >= 52 && (
                            <p className="truncate text-[10px] opacity-60">
                              Réservation native
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-taupe-200/40 px-4 py-2.5">
        {Object.entries(STATUS_CFG).map(([key, v]) => (
          <span
            key={key}
            className="flex items-center gap-1.5 text-[11px] text-taupe-500"
          >
            <span className={`h-2 w-2 rounded-full ${v.dot}`} />
            {v.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-taupe-500">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Réservation native
        </span>
        <span className="ml-auto hidden text-[11px] text-taupe-400 sm:block">
          Cliquer pour créer · Glisser pour déplacer · Cliquer sur une séance pour modifier
        </span>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {createSlot && (
          <CreateModal
            key="create"
            slot={createSlot}
            clients={clients}
            sessions={sessions}
            onClose={() => setCreateSlot(null)}
            onSuccess={() => {
              setCreateSlot(null);
              router.refresh();
            }}
          />
        )}
        {detailSession && (
          <DetailModal
            key="detail"
            session={detailSession}
            sessions={sessions}
            onClose={() => setDetailSession(null)}
            onSaved={() => {
              setDetailSession(null);
              router.refresh();
            }}
            onDeleted={() => {
              setDetailSession(null);
              router.refresh();
            }}
          />
        )}
        {detailBooking && (
          <BookingDetailModal
            key="booking-detail"
            booking={detailBooking}
            onClose={() => setDetailBooking(null)}
            onUpdated={() => {
              setDetailBooking(null);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────

function ModalOverlay({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      {...OVERLAY}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        {...CARD_SPRING}
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ── Create session modal ───────────────────────────────────────────────────

function CreateModal({
  slot,
  clients,
  sessions,
  onClose,
  onSuccess,
}: {
  slot: CreateSlot;
  clients: Profile[];
  sessions: SessionWithClient[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initDate = new Date(slot.date);
  initDate.setHours(slot.hour, slot.minute, 0, 0);

  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [datetimeStr, setDatetimeStr] = useState(toDatetimeLocal(initDate));
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState("");
  const [summary, setSummary] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedDate = (() => {
    const d = new Date(datetimeStr);
    return isNaN(d.getTime()) ? initDate : d;
  })();

  const conflict = checkConflict(sessions, selectedDate, duration);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    setError(null);
    startTransition(async () => {
      const result = await createCalendarSessionAction({
        client_id: clientId,
        scheduled_at: selectedDate.toISOString(),
        duration_min: duration,
        location,
        summary,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSuccess();
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-taupe-200/60 px-6 py-4">
          <h3 className="font-serif text-xl text-ink-900">Nouvelle séance</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-taupe-400 transition-colors hover:bg-sand-100 hover:text-ink-900"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <Field label="Client">
            {clients.length === 0 ? (
              <p className="text-sm text-taupe-400">
                Aucun client assigné. Ajoutez des clients depuis l&apos;espace admin.
              </p>
            ) : (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
                className={inputCls}
              >
                <option value="">— Choisir —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date et heure">
              <input
                type="datetime-local"
                value={datetimeStr}
                onChange={(e) => setDatetimeStr(e.target.value)}
                required
                className={inputCls}
              />
            </Field>
            <Field label="Durée">
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={inputCls}
              >
                {[30, 45, 60, 75, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Lieu (optionnel)">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Cabinet, en ligne, domicile…"
              className={inputCls}
            />
          </Field>

          <Field label="Note rapide (optionnel)">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={2}
              placeholder="Objectif de la séance, remarques…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {conflict && <ConflictWarning />}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !clientId || clients.length === 0}
              className={btnPrimary}
            >
              {isPending ? "Création…" : "Créer la séance"}
            </button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Detail / edit session modal ────────────────────────────────────────────

function DetailModal({
  session,
  sessions,
  onClose,
  onSaved,
  onDeleted,
}: {
  session: SessionWithClient;
  sessions: SessionWithClient[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const initDate = new Date(session.scheduled_at);
  const [datetimeStr, setDatetimeStr] = useState(toDatetimeLocal(initDate));
  const [duration, setDuration] = useState(session.duration_min);
  const [location, setLocation] = useState(session.location ?? "");
  const [status, setStatus] = useState<SessionStatus>(session.status);
  const [summary, setSummary] = useState(session.summary ?? "");
  const [isPending, startTransition] = useTransition();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cfg = STATUS_CFG[status] ?? STATUS_CFG.planifiée;

  const selectedDate = (() => {
    const d = new Date(datetimeStr);
    return isNaN(d.getTime()) ? initDate : d;
  })();

  const conflict = checkConflict(sessions, selectedDate, duration, session.id);
  const hasChanges =
    datetimeStr !== toDatetimeLocal(initDate) ||
    duration !== session.duration_min ||
    location !== (session.location ?? "") ||
    status !== session.status ||
    summary !== (session.summary ?? "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCalendarSessionAction(session.id, {
        status,
        summary,
        location,
        scheduled_at: selectedDate.toISOString(),
        duration_min: duration,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSessionAction(session.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-taupe-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-taupe-400">
                Séance
              </p>
              <h3 className="mt-0.5 font-serif text-xl text-ink-900">
                {session.client_display_name}
              </h3>
              <p className="mt-1 text-sm capitalize text-taupe-500">
                {fmtFull(session.scheduled_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
              >
                {cfg.label}
              </span>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-taupe-400 transition-colors hover:bg-sand-100 hover:text-ink-900"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 px-6 py-5">
          {/* Status */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-taupe-500">
              Statut
            </p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => {
                const c = STATUS_CFG[s];
                const active = status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? `${c.badge} scale-105 shadow-sm`
                        : "border-taupe-300/40 text-taupe-500 hover:border-taupe-400/60 hover:text-ink-900"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date et heure">
              <input
                type="datetime-local"
                value={datetimeStr}
                onChange={(e) => setDatetimeStr(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Durée">
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className={inputCls}
              >
                {[30, 45, 60, 75, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Lieu">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Cabinet, en ligne, domicile…"
              className={inputCls}
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
              placeholder="Bilan de la séance, objectifs, remarques…"
              className={`${inputCls} resize-none`}
            />
          </Field>

          {conflict && <ConflictWarning />}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            {/* Delete */}
            <div>
              {!deleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Supprimer
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(false)}
                    className="text-xs text-taupe-500 hover:text-ink-900"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? "Suppression…" : "Confirmer"}
                  </button>
                </div>
              )}
            </div>

            {/* Save */}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Fermer
              </button>
              <button
                type="submit"
                disabled={isPending || !hasChanges}
                className={btnPrimary}
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ModalOverlay>
  );
}

// ── Shared UI primitives ───────────────────────────────────────────────────

function Field({
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

function ConflictWarning() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <span className="shrink-0 font-bold">⚠</span>
      <span>Conflit horaire détecté avec une autre séance sur ce créneau.</span>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-taupe-300/50 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/20";

const btnPrimary =
  "rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800 disabled:opacity-50";

const btnSecondary =
  "rounded-xl border border-taupe-300/50 px-4 py-2.5 text-sm text-taupe-600 transition-colors hover:bg-sand-50";

// ── Booking detail modal ───────────────────────────────────────────────────

function BookingDetailModal({
  booking,
  onClose,
  onUpdated,
}: {
  booking: Booking;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [coachNotes, setCoachNotes] = useState(booking.coach_notes ?? "");
  const [status, setStatus] = useState(booking.status);
  const [error, setError] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const cfg = BOOKING_STATUS_CFG[status] ?? BOOKING_STATUS_CFG.confirmed;

  const hasChanges =
    coachNotes !== (booking.coach_notes ?? "") || status !== booking.status;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/booking/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, coach_notes: coachNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur.");
        return;
      }
      onUpdated();
    });
  }

  function handleCancel() {
    startTransition(async () => {
      const res = await fetch(`/api/booking/${booking.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Erreur lors de l'annulation.");
        return;
      }
      onUpdated();
    });
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-taupe-200/60 px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-taupe-400">
                Réservation native
              </p>
              <h3 className="mt-0.5 font-serif text-xl text-ink-900">
                {booking.client_name}
              </h3>
              <p className="mt-1 text-sm text-taupe-500">
                {fmtFull(booking.starts_at)} · {booking.duration_min} min
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.card}`}
              >
                {cfg.label}
              </span>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-taupe-400 transition-colors hover:bg-sand-100 hover:text-ink-900"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wider text-taupe-400">Email</p>
              <p className="mt-0.5 text-ink-900">{booking.client_email}</p>
            </div>
            {booking.client_phone && (
              <div>
                <p className="text-xs uppercase tracking-wider text-taupe-400">Téléphone</p>
                <p className="mt-0.5 text-ink-900">{booking.client_phone}</p>
              </div>
            )}
          </div>

          {booking.client_notes && (
            <div>
              <p className="text-xs uppercase tracking-wider text-taupe-400">Notes client</p>
              <p className="mt-1 rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink-900">
                {booking.client_notes}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-taupe-500">
              Statut
            </label>
            <div className="flex flex-wrap gap-2">
              {(["confirmed", "completed", "no_show"] as const).map((s) => {
                const c = BOOKING_STATUS_CFG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      status === s
                        ? `${c.card} scale-105 shadow-sm`
                        : "border-taupe-300/40 text-taupe-500 hover:border-taupe-400/60 hover:text-ink-900"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-taupe-500">
              Notes coach (privées)
            </label>
            <textarea
              value={coachNotes}
              onChange={(e) => setCoachNotes(e.target.value)}
              rows={3}
              placeholder="Notes internes, préparation séance…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <div>
              {!cancelConfirm ? (
                <button
                  type="button"
                  onClick={() => setCancelConfirm(true)}
                  className="rounded-lg px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                >
                  Annuler la réservation
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCancelConfirm(false)}
                    className="text-xs text-taupe-500 hover:text-ink-900"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? "Annulation…" : "Confirmer l'annulation"}
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className={btnSecondary}>
                Fermer
              </button>
              <button
                onClick={handleSave}
                disabled={isPending || !hasChanges}
                className={btnPrimary}
              >
                {isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
