import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getCoachClients,
  getAllActiveClients,
} from "@/lib/supabase/os-server";
import type { SessionWithClient } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { loadCoaches } from "@/lib/content/coaches.server";
import { getCalcomBookingsForCoach } from "@/lib/supabase/calcom-server";
import type { CalcomBooking } from "@/lib/supabase/calcom-server";
import type { SessionStatus } from "@/lib/os/types";
import { getCoachBookings } from "@/lib/supabase/booking.server";
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

  const isAdmin = profile.roles.includes("admin");
  const supabase = await getSupabaseServer();

  // Récupère le calcomUrl depuis la fiche coach publique (source officielle = /admin/coachs).
  // La table profiles.calcom_url est un cache optionnel ; on préfère la fiche publique
  // liée via coach.osProfileId === profile.id.
  const publicCoaches = await loadCoaches();
  const linkedCoach = publicCoaches.find((c) => c.osProfileId === profile.id);
  const calcomUrl = linkedCoach?.calcomUrl ?? profile.calcom_url ?? null;

  const [sessionsRes, clients, calcomRaw, nativeBookings] = await Promise.all([
    (() => {
      const q = supabase
        .from("sessions")
        .select("*, profiles!sessions_client_id_fkey(display_name)")
        .gte("scheduled_at", weekStart.toISOString())
        .lt("scheduled_at", weekEnd.toISOString())
        .order("scheduled_at");
      return isAdmin ? q : q.eq("coach_id", profile.id);
    })(),
    isAdmin ? getAllActiveClients() : getCoachClients(profile.id),
    isAdmin
      ? Promise.resolve([] as CalcomBooking[])
      : getCalcomBookingsForCoach(profile.id, weekStart, weekEnd).catch(
          () => [] as CalcomBooking[],
        ),
    isAdmin
      ? Promise.resolve([] as Booking[])
      : getCoachBookings(profile.id, weekStart, weekEnd).catch(() => [] as Booking[]),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internalSessions: SessionWithClient[] = (sessionsRes.data ?? []).map((row: any) => ({
    ...row,
    profiles: undefined,
    client_display_name:
      (row.profiles as { display_name: string } | null)?.display_name ?? "Client",
  }));

  const calcomSessions: SessionWithClient[] = calcomRaw.map(
    (b: CalcomBooking) => ({
      id: b.id,
      client_id: "",
      coach_id: b.coach_id,
      pack_id: null,
      offer_id: null,
      status: (b.status ?? "planifiée") as SessionStatus,
      scheduled_at: b.scheduled_at,
      duration_min: b.duration_min,
      location: b.location,
      summary: `Cal.com · ${b.client_email}`,
      created_at: b.created_at,
      updated_at: b.updated_at,
      client_display_name: `${b.client_name} ★`,
    }),
  );

  const sessions: SessionWithClient[] = [
    ...internalSessions,
    ...calcomSessions,
  ];

  return (
    <OsShell profile={profile} title="Calendrier">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Calendrier</h2>
        <p className="mt-1 text-sm text-taupe-500">
          {internalSessions.length} séance{internalSessions.length !== 1 ? "s" : ""} OS
          {calcomSessions.length > 0 && (
            <> · {calcomSessions.length} Cal.com</>
          )}
          {nativeBookings.length > 0 && (
            <> · {nativeBookings.length} réservation{nativeBookings.length !== 1 ? "s" : ""} native{nativeBookings.length !== 1 ? "s" : ""}</>
          )}
        </p>
      </div>

      <CalComSection calcomUrl={calcomUrl} />

      <CalendarClient
        sessions={sessions}
        clients={clients}
        weekStartISO={weekStartISO}
        nativeBookings={nativeBookings}
      />
    </OsShell>
  );
}

// ─── Cal.com section ──────────────────────────────────────────────────────────
//
// Pour activer la synchronisation complète des rendez-vous Cal.com :
//   1. Chaque coach génère une clé API dans : app.cal.com/settings/developer/api-keys
//   2. Stocker la clé dans le profil OS (colonne calcom_api_key à ajouter)
//   3. Appeler GET https://api.cal.com/v2/bookings avec Authorization: Bearer {key}
//   4. Fusionner les bookings Cal.com avec les sessions Supabase dans le calendrier
//
// Une variable CAL_API_KEY globale ne suffit pas : Cal.com utilise des clés par compte.

function CalComSection({ calcomUrl }: { calcomUrl: string | null }) {
  if (!calcomUrl) {
    return (
      <div className="mb-6 rounded-2xl border border-taupe-300/40 bg-white p-5">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cal.com
        </p>
        <p className="mt-2 text-sm text-taupe-500">
          Aucun lien Cal.com configuré pour ce compte. Contactez l&apos;administrateur
          pour l&apos;ajouter dans votre profil.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
            Cal.com
          </p>
          <p className="mt-0.5 font-serif text-lg text-ink-900">
            Agenda de réservation
          </p>
          <p className="mt-1 text-xs text-taupe-400">
            Synchronisation automatique non configurée — accédez directement à Cal.com.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://app.cal.com/bookings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800"
          >
            Voir mes rendez-vous ↗
          </a>
          <a
            href={calcomUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-4 py-2 text-sm text-taupe-600 transition-colors hover:bg-sand-50 hover:text-ink-900"
          >
            Ma page de réservation ↗
          </a>
        </div>
      </div>
      <div className="border-t border-taupe-100 bg-sand-50/60 px-6 py-3">
        <p className="text-xs text-taupe-400">
          Les rendez-vous Cal.com ne sont pas encore visibles dans le calendrier ci-dessous.
          Les séances créées manuellement ici sont enregistrées dans le Cabinet OS.
        </p>
      </div>
    </div>
  );
}
