import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { createClientForCoach } from "@/lib/supabase/admin-actions";

export async function POST(req: NextRequest) {
  console.log("[CREATE_CLIENT] POST /api/os/clients/create — début");

  // ── Diagnostic auth inline (remplace getOsProfileWithRole pour exposer les erreurs) ──
  let coachId: string | null = null;
  let diagMsg = "";

  try {
    const supabase = await getSupabaseServer();

    // Étape 1 : session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      diagMsg = `auth.getUser() erreur : ${userError.message} (status ${userError.status ?? "?"})`;
      console.error("[CREATE_CLIENT] Étape 1 FAIL:", diagMsg);
    } else if (!user) {
      diagMsg = "auth.getUser() n'a retourné aucun utilisateur — cookie de session absent ou expiré";
      console.error("[CREATE_CLIENT] Étape 1 FAIL:", diagMsg);
    } else {
      console.log("[CREATE_CLIENT] Étape 1 OK — user.id:", user.id, "email:", user.email);

      // Étape 2 : RPC get_my_profile (SECURITY DEFINER, contourne RLS)
      const { data: rpcRaw, error: rpcErr } = await supabase.rpc("get_my_profile");

      if (rpcErr) {
        console.error("[CREATE_CLIENT] Étape 2 RPC FAIL:", rpcErr.message, "code:", rpcErr.code);
        // Étape 2b : fallback SELECT direct
        const { data: directProfile, error: directErr } = await supabase
          .from("profiles")
          .select("id, role, roles, active")
          .eq("id", user.id)
          .maybeSingle();

        if (directErr) {
          diagMsg = `RPC get_my_profile: ${rpcErr.message} | SELECT profiles: ${directErr.message} (code: ${directErr.code}) — probable policy RLS manquante sur SELECT`;
          console.error("[CREATE_CLIENT] Étape 2b SELECT FAIL:", directErr.message, "code:", directErr.code);
        } else if (!directProfile) {
          diagMsg = `RPC get_my_profile: ${rpcErr.message} | SELECT profiles: aucun profil pour id=${user.id} — profil absent en base`;
          console.error("[CREATE_CLIENT] Étape 2b SELECT: profil introuvable pour", user.id);
        } else {
          console.log("[CREATE_CLIENT] Étape 2b SELECT OK — profil:", JSON.stringify(directProfile));
          const roles: string[] = Array.isArray(directProfile.roles) && (directProfile.roles as string[]).length > 0
            ? (directProfile.roles as string[])
            : [directProfile.role as string];
          if (!roles.includes("coach") && !roles.includes("admin")) {
            diagMsg = `Rôle insuffisant — roles=[${roles.join(",")}] role=${directProfile.role}`;
          } else if (!directProfile.active) {
            diagMsg = `Compte inactif (active=false)`;
          } else {
            coachId = directProfile.id as string;
          }
        }
      } else {
        const raw = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw;
        console.log("[CREATE_CLIENT] Étape 2 RPC OK — raw:", JSON.stringify(raw));

        if (!raw || typeof raw !== "object" || !("id" in raw)) {
          diagMsg = `RPC get_my_profile a retourné une forme inattendue : ${JSON.stringify(rpcRaw)}`;
          console.error("[CREATE_CLIENT] Étape 2 RPC shape inattendue");
        } else {
          const p = raw as { id: string; role: string; roles: unknown; active: boolean };
          const roles: string[] = Array.isArray(p.roles) && (p.roles as string[]).length > 0
            ? (p.roles as string[])
            : [p.role];
          if (!roles.includes("coach") && !roles.includes("admin")) {
            diagMsg = `Rôle insuffisant — roles=[${roles.join(",")}] role=${p.role}`;
            console.error("[CREATE_CLIENT] Étape 3 FAIL rôle:", diagMsg);
          } else if (!p.active) {
            diagMsg = `Compte désactivé (active=false)`;
            console.error("[CREATE_CLIENT] Étape 3 FAIL inactif");
          } else {
            coachId = p.id;
            console.log("[CREATE_CLIENT] Étape 3 OK — coachId:", coachId, "roles:", roles);
          }
        }
      }
    }
  } catch (e) {
    diagMsg = `Exception inattendue : ${e instanceof Error ? e.message : String(e)}`;
    console.error("[CREATE_CLIENT] Exception:", diagMsg);
  }

  if (!coachId) {
    return NextResponse.json(
      { ok: false, error: `Non autorisé — ${diagMsg}` },
      { status: 401 },
    );
  }

  // ── Lecture du corps ──────────────────────────────────────────────────────
  let body: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    goal?: string;
    notes?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps de requête invalide." }, { status: 400 });
  }

  const { first_name = "", last_name = "", email = "", phone = "", goal = "", notes = "" } = body;
  const display_name = `${first_name.trim()} ${last_name.trim()}`.trim();

  if (!display_name || !email.trim()) {
    return NextResponse.json(
      { ok: false, error: "Prénom, nom et email sont obligatoires." },
      { status: 400 },
    );
  }

  const bioParts: string[] = [];
  if (goal.trim()) bioParts.push(`Objectif : ${goal.trim()}`);
  if (notes.trim()) bioParts.push(notes.trim());

  console.log("[CREATE_CLIENT] Création client — coachId:", coachId, "email:", email.trim().toLowerCase());

  const result = await createClientForCoach(coachId, {
    email: email.trim().toLowerCase(),
    display_name,
    phone: phone.trim() || undefined,
    bio: bioParts.join("\n\n") || undefined,
  });

  console.log("[CREATE_CLIENT] Résultat:", result.ok ? "OK" : `FAIL: ${result.error}`);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
