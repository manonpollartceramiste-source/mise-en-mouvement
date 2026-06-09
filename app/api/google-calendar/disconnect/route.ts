import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin, isAuthorizedAdmin } from "@/lib/supabase/server";

// POST /api/google-calendar/disconnect
// Corps JSON optionnel : { coach_profile_id: string } — pour les admins qui déconnectent un autre coach.
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let targetCoachId = user.id;

  // Permet à un admin de déconnecter le calendrier d'un autre coach
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.coach_profile_id && typeof body.coach_profile_id === "string") {
      if (!isAuthorizedAdmin(user.email)) {
        return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
      }
      targetCoachId = body.coach_profile_id;
    }
  } catch {
    // corps vide ou non-JSON → on déconnecte le coach courant
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("coach_google_tokens")
    .delete()
    .eq("coach_id", targetCoachId);

  if (error) {
    console.error("[gcal disconnect] DB delete failed:", error.message);
    return NextResponse.json({ error: "Erreur lors de la déconnexion." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
