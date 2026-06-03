import { NextRequest, NextResponse } from "next/server";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ bilanId: string }> },
) {
  const { bilanId } = await params;

  const profile = await getOsProfileWithRole("coach");
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  const isAdmin = Array.isArray(profile.roles)
    ? profile.roles.includes("admin")
    : profile.role === "admin";

  const admin = getSupabaseAdmin();

  const { data: bilan, error: fetchError } = await admin
    .from("movement_assessments")
    .select("id, coach_id, client_id")
    .eq("id", bilanId)
    .maybeSingle();

  if (fetchError) {
    console.error(`[BILAN_DELETE] Fetch error: ${fetchError.message}`);
    return NextResponse.json({ ok: false, error: "Erreur base de données." }, { status: 500 });
  }
  if (!bilan) {
    return NextResponse.json({ ok: false, error: "Bilan introuvable." }, { status: 404 });
  }
  if (!isAdmin && bilan.coach_id !== profile.id) {
    return NextResponse.json({ ok: false, error: "Non autorisé à supprimer ce bilan." }, { status: 403 });
  }

  console.log(`[BILAN_DELETE] Start — bilanId: ${bilanId}, clientId: ${bilan.client_id}`);

  const { error: deleteError } = await admin
    .from("movement_assessments")
    .delete()
    .eq("id", bilanId);

  if (deleteError) {
    console.error(`[BILAN_DELETE] Delete error: ${deleteError.message} | code: ${deleteError.code}`);
    return NextResponse.json(
      { ok: false, error: `Erreur suppression bilan : ${deleteError.message}` },
      { status: 500 },
    );
  }

  console.log(`[BILAN_DELETE] Complete — bilanId: ${bilanId}`);
  return NextResponse.json({ ok: true, clientId: bilan.client_id });
}
