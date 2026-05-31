"use server";

import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function submitQuestionnaireAction(formData: FormData) {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const qId = String(formData.get("questionnaire_id") ?? "").trim();
  if (!qId)
    redirect("/os/client/questionnaire?error=Questionnaire+introuvable.");

  const answers = {
    main_goal: String(formData.get("main_goal") ?? "").trim(),
    secondary_goals: String(formData.get("secondary_goals") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    motivation: String(formData.get("motivation") ?? "").trim(),
    medical_history: String(formData.get("medical_history") ?? "").trim(),
    injuries: String(formData.get("injuries") ?? "").trim(),
    medications: String(formData.get("medications") ?? "").trim(),
    current_activity: String(formData.get("current_activity") ?? "").trim(),
    activity_frequency: String(formData.get("activity_frequency") ?? "").trim(),
    sleep_hours:
      Number(formData.get("sleep_hours") ?? "") || null,
    stress_level: (Number(formData.get("stress_level") ?? "") ||
      null) as 1 | 2 | 3 | 4 | 5 | null,
    diet_description: String(formData.get("diet_description") ?? "").trim(),
    dietary_restrictions: String(
      formData.get("dietary_restrictions") ?? "",
    ).trim(),
    availability: String(formData.get("availability") ?? "").trim(),
    preferred_schedule: String(
      formData.get("preferred_schedule") ?? "",
    ).trim(),
    additional_info: String(formData.get("additional_info") ?? "").trim(),
  };

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("questionnaires")
    .update({
      status: "soumis",
      answers,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", qId)
    .eq("client_id", profile.id);

  if (error)
    redirect(
      `/os/client/questionnaire?error=${encodeURIComponent(error.message)}`,
    );
  redirect(
    "/os/client/questionnaire?saved=Questionnaire+envoyé+à+votre+coach.",
  );
}
