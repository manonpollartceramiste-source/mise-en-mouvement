import { type NextRequest, NextResponse } from "next/server";
import { verifyOAuthState, exchangeCodeForTokens } from "@/lib/google/oauth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

// GET /api/oauth/google/callback — reçoit le code de Google et stocke les tokens
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const googleError = searchParams.get("error");

  const settingsUrl = new URL("/os/coach/settings", req.url);

  // Refus de l'utilisateur sur la page Google
  if (googleError === "access_denied") {
    settingsUrl.searchParams.set("gcal", "denied");
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("gcal", "error");
    return NextResponse.redirect(settingsUrl);
  }

  // Vérifier le state signé et extraire le coachId
  const coachId = verifyOAuthState(state);
  if (!coachId) {
    settingsUrl.searchParams.set("gcal", "error-state");
    return NextResponse.redirect(settingsUrl);
  }

  // Échanger le code contre des tokens
  let tokens;
  try {
    tokens = await exchangeCodeForTokens(code);
  } catch (err) {
    console.error("[gcal callback] token exchange failed:", err);
    settingsUrl.searchParams.set("gcal", "error-exchange");
    return NextResponse.redirect(settingsUrl);
  }

  // Stocker les tokens en DB (service role — bypass RLS)
  const admin = getSupabaseAdmin();
  const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const now = new Date().toISOString();

  const upsertData: Record<string, string> = {
    coach_id: coachId,
    access_token: tokens.access_token,
    token_expiry: tokenExpiry,
    scope: tokens.scope,
    connected_at: now,
    updated_at: now,
  };
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token;
  }

  const { error: dbError } = await admin
    .from("coach_google_tokens")
    .upsert(upsertData, { onConflict: "coach_id" });

  if (dbError) {
    console.error("[gcal callback] DB upsert failed:", dbError.message);
    settingsUrl.searchParams.set("gcal", "error-db");
    return NextResponse.redirect(settingsUrl);
  }

  settingsUrl.searchParams.set("gcal", "connected");
  return NextResponse.redirect(settingsUrl);
}
