import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import type { Session } from "@/lib/os/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mes séances · Client",
  robots: { index: false, follow: false },
};

const fmtFull = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const fmtShort = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const STATUS_CONFIG: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  planifiée: {
    label: "Planifiée",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200/60",
  },
  réalisée: {
    label: "Réalisée",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-200/60",
  },
  annulée: {
    label: "Annulée",
    dot: "bg-red-400",
    badge: "bg-red-50 text-red-700 border-red-200/60",
  },
  no_show: {
    label: "Absent",
    dot: "bg-taupe-400",
    badge: "bg-taupe-100 text-taupe-600 border-taupe-300/40",
  },
};

export default async function ClientSeancesPage() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("client_id", profile.id)
    .order("scheduled_at", { ascending: false });

  const sessions = (data ?? []) as Session[];
  const now = new Date();

  const upcoming = sessions
    .filter((s) => s.status === "planifiée" && new Date(s.scheduled_at) >= now)
    .reverse();

  const past = sessions.filter(
    (s) =>
      s.status !== "planifiée" || new Date(s.scheduled_at) < now,
  );

  const doneCount = sessions.filter((s) => s.status === "réalisée").length;

  return (
    <OsShell profile={profile} title="Mes séances">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Mes séances</h2>
        {doneCount > 0 && (
          <p className="mt-1 text-sm text-taupe-500">
            {doneCount} séance{doneCount > 1 ? "s" : ""} réalisée{doneCount > 1 ? "s" : ""}
          </p>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-300/60 bg-sand-100/30 p-12 text-center">
          <p className="font-serif text-xl text-ink-900">
            Aucune séance planifiée
          </p>
          <p className="mt-2 text-sm text-taupe-500">
            Votre coach planifiera vos séances prochainement.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {upcoming.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
                À venir
              </h3>
              <div className="space-y-3">
                {upcoming.map((s) => (
                  <SessionCard key={s.id} session={s} featured />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
                Historique
              </h3>
              <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
                <ul className="divide-y divide-taupe-300/20">
                  {past.map((s) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}
    </OsShell>
  );
}

function SessionCard({
  session,
  featured = false,
}: {
  session: Session;
  featured?: boolean;
}) {
  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.planifiée;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        featured
          ? "border-taupe-300/50 bg-ink-900 text-sand-50"
          : "border-taupe-300/40 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p
            className={`font-serif text-lg capitalize ${featured ? "text-sand-50" : "text-ink-900"}`}
          >
            {fmtFull.format(new Date(session.scheduled_at))}
          </p>
          <div
            className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm ${featured ? "text-sand-400" : "text-taupe-500"}`}
          >
            <span>{session.duration_min} min</span>
            {session.location && <span>{session.location}</span>}
          </div>
          {session.summary && (
            <p
              className={`mt-3 text-sm italic ${featured ? "text-sand-300" : "text-taupe-600"}`}
            >
              &ldquo;{session.summary}&rdquo;
            </p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cfg.badge}`}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: Session }) {
  const cfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.planifiée;

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="flex items-start gap-3">
        <div
          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`}
        />
        <div>
          <p className="text-sm font-medium text-ink-900 capitalize">
            {fmtShort.format(new Date(session.scheduled_at))}
          </p>
          <p className="mt-0.5 text-xs text-taupe-400">
            {session.duration_min} min
            {session.location ? ` · ${session.location}` : ""}
          </p>
          {session.summary && (
            <p className="mt-1.5 text-xs italic text-taupe-500">
              &ldquo;{session.summary}&rdquo;
            </p>
          )}
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${cfg.badge}`}
      >
        {cfg.label}
      </span>
    </li>
  );
}
