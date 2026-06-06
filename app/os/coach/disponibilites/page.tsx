import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import {
  getAvailabilityRules,
  getAllFutureUnavailabilities,
  getBookingSettings,
} from "@/lib/supabase/booking.server";
import { OsShell } from "@/app/os/_components/OsShell";
import { DisponibilitesClient } from "./DisponibilitesClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Disponibilités · Coach",
  robots: { index: false, follow: false },
};

export default async function DisponibilitesPage() {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const [rules, unavailabilities, settings] = await Promise.all([
    getAvailabilityRules(profile.id),
    getAllFutureUnavailabilities(profile.id),
    getBookingSettings(profile.id),
  ]);

  return (
    <OsShell profile={profile} title="Disponibilités">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Disponibilités</h2>
        <p className="mt-1 text-sm text-taupe-500">
          Gérez vos horaires, absences et paramètres de réservation.
        </p>
      </div>

      <DisponibilitesClient
        initialRules={rules}
        initialUnavailabilities={unavailabilities}
        initialSettings={settings}
      />
    </OsShell>
  );
}
