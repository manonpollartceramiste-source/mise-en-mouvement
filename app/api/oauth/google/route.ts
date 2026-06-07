import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { buildGoogleOAuthUrl } from "@/lib/google/oauth";

// GET /api/oauth/google — démarre le flow OAuth Google Calendar
export async function GET(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/os/login", req.url));
  }

  let authUrl: string;
  try {
    authUrl = buildGoogleOAuthUrl(user.id);
  } catch (err) {
    console.error("[gcal oauth] buildGoogleOAuthUrl failed:", err);
    return NextResponse.redirect(
      new URL("/os/coach/settings?gcal=error-config", req.url),
    );
  }

  return NextResponse.redirect(authUrl);
}
