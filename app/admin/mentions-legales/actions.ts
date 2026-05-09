"use server";

import { redirect } from "next/navigation";
import {
  defaultLegal,
  legalSchema,
  type LegalCoach,
  type LegalContent,
} from "@/lib/content/legal";
import { saveContentKey } from "@/lib/supabase/content";

const REVALIDATE_PATHS = [
  "/mentions-legales",
  "/confidentialite",
  "/contact",
  "/admin/mentions-legales",
];

function fail(reason: string): never {
  redirect(`/admin/mentions-legales?error=${encodeURIComponent(reason)}`);
}

function done(msg: string): never {
  redirect(`/admin/mentions-legales?saved=${encodeURIComponent(msg)}`);
}

export async function saveLegal(formData: FormData) {
  const coachCountRaw = String(formData.get("coachCount") ?? "0");
  const coachCount = Math.max(0, Math.min(8, Number(coachCountRaw) || 0));
  const coaches: LegalCoach[] = [];
  for (let i = 0; i < coachCount; i++) {
    const name = String(formData.get(`coach_${i}_name`) ?? "").trim();
    const role = String(formData.get(`coach_${i}_role`) ?? "").trim();
    const siret = String(formData.get(`coach_${i}_siret`) ?? "").trim();
    if (name) coaches.push({ name, role, siret });
  }

  const candidate: LegalContent = {
    ...defaultLegal,
    cabinetName: String(formData.get("cabinetName") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
    editorIntro: String(formData.get("editorIntro") ?? ""),
    coaches,
    hostingName: String(formData.get("hostingName") ?? ""),
    hostingAddress: String(formData.get("hostingAddress") ?? ""),
    additionalNotes: String(formData.get("additionalNotes") ?? ""),
    privacyDataCollected: String(formData.get("privacyDataCollected") ?? ""),
    privacyPurposes: String(formData.get("privacyPurposes") ?? ""),
    privacySubprocessors: String(formData.get("privacySubprocessors") ?? ""),
    privacyRetention: String(formData.get("privacyRetention") ?? ""),
    privacyRights: String(formData.get("privacyRights") ?? ""),
    privacyCookies: String(formData.get("privacyCookies") ?? ""),
  };

  const parsed = legalSchema.safeParse(candidate);
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Validation échouée.");
  }

  const res = await saveContentKey("legal", parsed.data, REVALIDATE_PATHS);
  if (!res.ok) fail(res.error);
  done("Mentions légales enregistrées.");
}
