import "server-only";

import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendClientReminderEmail } from "@/lib/email/send-booking-emails";
import {
  buildReminderWindow,
  claimCutoff,
  lateBookingCutoff,
} from "@/lib/booking/reminder-helpers";
import type { Booking } from "@/lib/booking/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const { windowStart, windowEnd } = buildReminderWindow(now);
  const expiredBefore = claimCutoff(now);
  const createdBefore = lateBookingCutoff(now);

  const { data: candidates, error: selectError } = await supabase
    .from("bookings")
    .select("*")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .or(`reminder_claimed_at.is.null,reminder_claimed_at.lt.${expiredBefore.toISOString()}`)
    .gte("starts_at", windowStart.toISOString())
    .lt("starts_at", windowEnd.toISOString())
    .lt("created_at", createdBefore.toISOString());

  if (selectError) {
    console.error("[cron/reminder] select failed:", selectError.message);
    return NextResponse.json({ error: "Erreur interne." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of (candidates ?? []) as Booking[]) {
    if (!candidate.client_email) {
      skipped++;
      continue;
    }

    // Verrou atomique : seule une exécution concurrente peut réclamer la ligne
    const { data: claimed, error: claimError } = await supabase
      .from("bookings")
      .update({ reminder_claimed_at: now.toISOString() })
      .eq("id", candidate.id)
      .is("reminder_sent_at", null)
      .or(`reminder_claimed_at.is.null,reminder_claimed_at.lt.${expiredBefore.toISOString()}`)
      .select("id");

    if (claimError) {
      console.error(`[cron/reminder] claim error ${candidate.id}:`, claimError.message);
      failed++;
      continue;
    }

    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    try {
      await sendClientReminderEmail(candidate);
      await supabase
        .from("bookings")
        .update({ reminder_sent_at: now.toISOString() })
        .eq("id", candidate.id);
      sent++;
    } catch (err) {
      console.error(`[cron/reminder] email failed ${candidate.id}:`, err);
      failed++;
      // reminder_claimed_at reste : expire dans REMINDER_CLAIM_EXPIRY_MINUTES minutes
    }
  }

  console.log(
    `[cron/reminder] candidates=${(candidates ?? []).length} sent=${sent} skipped=${skipped} failed=${failed}`,
  );
  return NextResponse.json({ sent, skipped, failed });
}
