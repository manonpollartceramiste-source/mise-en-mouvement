"use server";

import { redirect } from "next/navigation";
import {
  dayKeys,
  openingHoursSchema,
  type DaySchedule,
} from "@/lib/content/hours";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = ["/contact", "/admin/horaires"];

function fail(reason: string): never {
  redirect(`/admin/horaires?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/horaires?saved=${encodeURIComponent(msg)}`);
}

export async function saveHours(formData: FormData) {
  const next: DaySchedule[] = dayKeys.map((day) => ({
    day,
    closed: formData.get(`${day}_closed`) === "on",
    open: String(formData.get(`${day}_open`) ?? "00:00"),
    close: String(formData.get(`${day}_close`) ?? "00:00"),
  }));

  const parsed = openingHoursSchema.safeParse(next);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
  }

  const res = await saveContentKey("hours", parsed.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done("Horaires enregistrés.");
}
