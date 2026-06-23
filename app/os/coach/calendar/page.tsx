import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getCoachClients,
  getAllActiveClients,
  getAllSessionsInRange,
} from "@/lib/supabase/os-server";
import type { SessionWithClient } from "@/lib/supabase/os-server";
import { getAllBookingsInRange } from "@/lib/supabase/booking.server";
import type { Booking } from "@/lib/booking/types";
import { OsShell } from "@/app/os/_components/OsShell";
import { CalendarClient } from "./CalendarClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Calendrier · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ week?: string }>;

function getMondayISO(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseWeekStart(week?: string): string {
  if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
    const d = new Date(week + "T00:00:00");
    if (!isNaN(d.getTime())) return getMondayISO(d);
  }
  return getMondayISO(new Date());
}

export default async function CoachCalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { week } = await searchParams;
  const weekStartISO = parseWeekStart(week);

  const [y, m, d] = weekStartISO.split("-").map(Number);
  const weekStart = new Date(y, m - 1, d);
  const weekEnd = new Date(y, m - 1, d + 7);

  const isAdmin = (profile.roles ?? []).includes("admin");

  // getAllSessionsInRange bypasse RLS via admin client → tous les coachs voient tout
  const [sessions, clients, nativeBookings] = await Promise.all([
    getAllSessionsInRange(weekStart, weekEnd).catch((err) => {
      console.error("[CalendarPage] getAllSessionsInRange error:", err);
      return [] as SessionWithClient[];
    }),
    isAdmin ? getAllActiveClients() : getCoachClients(profile.id),
    getAllBookingsInRange(weekStart, weekEnd).catch((err) => {
      console.error("[CalendarPage] getAllBookingsInRange error:", err);
      return [] as Booking[];
    }),
  ]);

  return (
    <OsShell profile={profile} title="Calendrier">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Calendrier</h2>
        <p className="mt-1 text-sm text-taupe-500">
          {sessions.length} séance{sessions.length !== 1 ? "s" : ""}
          {nativeBookings.length > 0 && (
            <> · {nativeBookings.length} réservation{nativeBookings.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      <CalendarClient
        sessions={sessions}
        clients={clients}
        currentCoachId={profile.id}
        weekStartISO={weekStartISO}
        nativeBookings={nativeBookings}
      />
    </OsShell>
  );
}
