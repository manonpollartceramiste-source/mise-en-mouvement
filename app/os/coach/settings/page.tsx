import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Paramètres · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ gcal?: string }>;

async function disconnectGcalAction() {
  "use server";
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");
  const admin = getSupabaseAdmin();
  await admin.from("coach_google_tokens").delete().eq("coach_id", profile.id);
  redirect("/os/coach/settings?gcal=disconnected");
}

export default async function CoachSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const admin = getSupabaseAdmin();
  const { data: gcalToken } = await admin
    .from("coach_google_tokens")
    .select("coach_id, connected_at")
    .eq("coach_id", profile.id)
    .maybeSingle();

  const gcalConnected = !!gcalToken;
  const params = await searchParams;
  const gcalFlash = params.gcal ?? null;

  const gcalFlashMessage: Record<string, { type: "success" | "error" | "info"; text: string }> = {
    connected: { type: "success", text: "Google Agenda connecté avec succès." },
    disconnected: { type: "info", text: "Google Agenda déconnecté." },
    denied: { type: "info", text: "Connexion annulée." },
    error: { type: "error", text: "Une erreur est survenue. Réessayez." },
    "error-config": { type: "error", text: "Configuration manquante (GOOGLE_OAUTH_CLIENT_ID). Contactez l'administrateur." },
    "error-state": { type: "error", text: "Paramètre de sécurité invalide ou expiré. Réessayez." },
    "error-exchange": { type: "error", text: "Échange de code Google échoué. Réessayez." },
    "error-db": { type: "error", text: "Erreur lors de la sauvegarde. Réessayez." },
  };

  const flash = gcalFlash ? gcalFlashMessage[gcalFlash] : null;

  return (
    <main className="min-h-screen bg-sand-50 px-6 py-12">
      <div className="mx-auto w-full max-w-md space-y-6">
        <Link
          href="/os/coach"
          className="inline-flex items-center gap-2 text-sm text-taupe-600 transition-colors hover:text-ink-900"
        >
          ← Retour au tableau de bord
        </Link>

        {/* ── Mot de passe ─────────────────────────────────────────── */}
        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Cabinet OS · Coach
            </p>
            <h1 className="mt-3 font-serif text-3xl text-ink-900">
              Changer mon mot de passe
            </h1>
            <p className="mt-2 text-sm text-taupe-600">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
          </div>
          <PasswordForm />
        </div>

        {/* ── Google Agenda ─────────────────────────────────────────── */}
        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8 shadow-sm">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Intégrations
            </p>
            <h2 className="mt-3 font-serif text-2xl text-ink-900">
              Google Agenda
            </h2>
            <p className="mt-2 text-sm text-taupe-600">
              Synchronise automatiquement vos réservations dans votre calendrier Google.
            </p>
          </div>

          {flash && (
            <div
              className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
                flash.type === "success"
                  ? "border-emerald-300/60 bg-emerald-50 text-emerald-800"
                  : flash.type === "error"
                    ? "border-red-300/60 bg-red-50 text-red-800"
                    : "border-taupe-300/40 bg-sand-100 text-taupe-700"
              }`}
            >
              {flash.text}
            </div>
          )}

          {gcalConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-ink-900">Connecté</span>
              </div>
              <form action={disconnectGcalAction}>
                <button
                  type="submit"
                  className="text-sm text-taupe-500 underline underline-offset-4 transition-colors hover:text-red-700"
                >
                  Déconnecter Google Agenda
                </button>
              </form>
            </div>
          ) : (
            <a
              href="/api/oauth/google"
              className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 bg-sand-50 px-5 py-2.5 text-sm font-medium text-ink-900 transition-all duration-300 hover:border-taupe-400/70 hover:shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connecter Google Agenda
            </a>
          )}
        </div>

        <p className="text-center text-xs text-taupe-400">
          Espace sécurisé · Données personnelles protégées
        </p>
      </div>
    </main>
  );
}
