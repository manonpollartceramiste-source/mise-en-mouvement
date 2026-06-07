import "server-only";
import { createHmac } from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GCAL_SCOPE = "https://www.googleapis.com/auth/calendar.events";

function getStateSecret(): string {
  // Réutilise le service role key comme secret HMAC — déjà un secret serveur long et aléatoire
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-gcal-state-secret";
}

export function getGoogleCallbackUrl(): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${base}/api/oauth/google/callback`;
}

/** Génère l'URL d'autorisation Google avec un état HMAC signé. */
export function buildGoogleOAuthUrl(coachId: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID manquante");

  const payload = Buffer.from(
    JSON.stringify({ uid: coachId, ts: Date.now() }),
  ).toString("base64url");
  const sig = createHmac("sha256", getStateSecret()).update(payload).digest("hex");
  const state = `${payload}.${sig}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getGoogleCallbackUrl(),
    response_type: "code",
    scope: GCAL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

/**
 * Vérifie la signature du state OAuth et retourne le coachId.
 * Retourne null si le state est invalide ou expiré (> 10 min).
 */
export function verifyOAuthState(state: string): string | null {
  const dotIdx = state.lastIndexOf(".");
  if (dotIdx === -1) return null;

  const payload = state.slice(0, dotIdx);
  const sig = state.slice(dotIdx + 1);

  const expectedSig = createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("hex");
  if (sig !== expectedSig) return null;

  let parsed: { uid?: string; ts?: number };
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }

  if (!parsed.ts || Date.now() - parsed.ts > 10 * 60 * 1000) return null;
  if (!parsed.uid) return null;

  return parsed.uid;
}

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

/** Échange un code d'autorisation contre des tokens d'accès Google. */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_OAUTH_CLIENT_ID ou GOOGLE_OAUTH_CLIENT_SECRET manquant");
  }

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getGoogleCallbackUrl(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<GoogleTokens>;
}

/** Rafraîchit un access_token expiré via le refresh_token. */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth credentials manquantes");

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}
