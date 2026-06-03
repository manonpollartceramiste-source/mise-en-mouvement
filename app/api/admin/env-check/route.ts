import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_URL",
] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const vars = Object.fromEntries(
    REQUIRED_VARS.map((name) => [
      name,
      process.env[name] ? "présente" : "MANQUANTE",
    ]),
  );

  const missing = REQUIRED_VARS.filter((name) => !process.env[name]);

  return NextResponse.json({
    ok: missing.length === 0,
    vars,
    missing,
  });
}
