import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadHours } from "@/lib/content/hours.server";
import { dayLabels, type DaySchedule } from "@/lib/content/hours";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Checkbox, SubmitButton } from "../_components/Fields";
import { saveHours } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Horaires",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminHoursPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const hours = await loadHours();
  const params = await searchParams;

  return (
    <AdminShell
      title="Horaires d’ouverture"
      intro="Définit les horaires affichés sur la page contact. Chaque coach gère ses propres créneaux directement dans Cal.com."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <form action={saveHours} className="rounded-2xl border border-taupe-300/40 bg-white p-6">
        <div className="space-y-4">
          {hours.map((schedule) => (
            <DayRow key={schedule.day} schedule={schedule} />
          ))}
        </div>
        <div className="mt-8 flex justify-end">
          <SubmitButton>Enregistrer les horaires →</SubmitButton>
        </div>
      </form>
    </AdminShell>
  );
}

function DayRow({ schedule }: { schedule: DaySchedule }) {
  const inputCls =
    "rounded-xl border border-taupe-300/50 bg-white px-3 py-2 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30";
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-taupe-300/30 py-3 last:border-b-0 sm:grid-cols-[120px_auto_1fr_1fr]">
      <span className="font-serif text-base text-ink-900">
        {dayLabels[schedule.day]}
      </span>
      <Checkbox
        name={`${schedule.day}_closed`}
        label="Fermé"
        defaultChecked={schedule.closed}
      />
      <label className="flex items-center gap-3 text-sm text-taupe-600">
        Ouverture
        <input
          type="time"
          name={`${schedule.day}_open`}
          defaultValue={schedule.open}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-3 text-sm text-taupe-600">
        Fermeture
        <input
          type="time"
          name={`${schedule.day}_close`}
          defaultValue={schedule.close}
          className={inputCls}
        />
      </label>
    </div>
  );
}
