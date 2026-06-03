import { NextRequest, NextResponse } from "next/server";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const { clientId } = await params;

  const profile = await getOsProfileWithRole("coach");
  if (!profile) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  const isAdmin = Array.isArray(profile.roles)
    ? profile.roles.includes("admin")
    : profile.role === "admin";

  const admin = getSupabaseAdmin();

  // Vérifier que le client existe et appartient à ce coach (ou user est admin)
  const { data: clientProfile, error: fetchError } = await admin
    .from("profiles")
    .select("id, display_name, coach_id, role")
    .eq("id", clientId)
    .eq("role", "client")
    .maybeSingle();

  if (fetchError) {
    console.error(`[CLIENT_DELETE] Fetch error: ${fetchError.message}`);
    return NextResponse.json({ ok: false, error: "Erreur base de données." }, { status: 500 });
  }
  if (!clientProfile) {
    return NextResponse.json({ ok: false, error: "Client introuvable." }, { status: 404 });
  }
  if (!isAdmin && clientProfile.coach_id !== profile.id) {
    return NextResponse.json({ ok: false, error: "Non autorisé à supprimer ce client." }, { status: 403 });
  }

  console.log(`[CLIENT_DELETE] Start — clientId: ${clientId}`);

  // 1. Supprimer les fichiers du bucket os-pdfs
  const { data: files, error: listError } = await admin.storage
    .from("os-pdfs")
    .list(clientId);

  if (listError) {
    console.warn(`[CLIENT_DELETE] Storage list warning: ${listError.message}`);
  } else if (files && files.length > 0) {
    const paths = files.map((f) => `${clientId}/${f.name}`);
    const { error: removeError } = await admin.storage.from("os-pdfs").remove(paths);
    if (removeError) {
      console.warn(`[CLIENT_DELETE] Storage remove warning: ${removeError.message}`);
    } else {
      console.log(`[CLIENT_DELETE] Deleted ${paths.length} file(s) from os-pdfs/${clientId}/`);
    }
  } else {
    console.log(`[CLIENT_DELETE] No files in os-pdfs/${clientId}/`);
  }

  // 2. Supprimer le profil (CASCADE sur : session_packs, sessions, measures,
  //    coach_notes, questionnaires, movement_tests, client_goals, movement_assessments)
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", clientId);

  if (profileError) {
    console.error(`[CLIENT_DELETE] Profile delete error: ${profileError.message} | code: ${profileError.code}`);
    return NextResponse.json(
      { ok: false, error: `Erreur suppression profil : ${profileError.message}` },
      { status: 500 },
    );
  }
  console.log(`[CLIENT_DELETE] Profile deleted — tables cascadées nettoyées`);

  // 3. Supprimer le compte Auth Supabase
  const { error: authError } = await admin.auth.admin.deleteUser(clientId);
  if (authError) {
    // Non bloquant : le profil est supprimé, l'orphelin auth est acceptable
    console.warn(`[CLIENT_DELETE] Auth delete warning: ${authError.message}`);
  } else {
    console.log(`[CLIENT_DELETE] Auth user deleted`);
  }

  console.log(`[CLIENT_DELETE] Complete — clientId: ${clientId}`);
  return NextResponse.json({ ok: true });
}
