import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured, getSupabaseServer } from "@/lib/supabase/server";
import { osSignIn } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  "supabase-missing": "La base de données n'est pas encore configurée.",
  "missing-fields": "Email et mot de passe requis.",
  "unauthorized": "Accès non autorisé. Contactez votre coach.",
  "unknown-role": "Rôle inconnu. Contactez l'administrateur.",
  "auth-error": "Identifiants incorrects.",
  "lien_invalide": "Ce lien d'invitation est invalide ou a expiré. Demandez un renvoi de l'invitation.",
};

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function OsLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;
  const configured = isSupabaseConfigured();

  // Auto-redirect uniquement si aucun paramètre error dans l'URL.
  // Si error est présent (ex. unauthorized renvoyé par le proxy), ne pas boucler.
  if (configured && !error) {
    let autoRedirect: string | null = null;
    try {
      const supabase = await getSupabaseServer();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rpcRaw } = await supabase.rpc("get_my_profile");
        const p = Array.isArray(rpcRaw) ? rpcRaw[0] : rpcRaw;
        if (p?.active) {
          const roles: string[] =
            Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : [p.role as string];
          if (roles.includes("coach")) autoRedirect = "/os/coach";
          else if (roles.includes("client")) autoRedirect = "/os/client";
          else if (roles.includes("admin")) autoRedirect = "/admin";
        }
      }
    } catch {
      // Ignore — afficher la page de login normalement
    }
    if (autoRedirect) redirect(autoRedirect);
  }

  const errorLabel = error
    ? (errorMessages[error] ?? decodeURIComponent(error))
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-md">

        {/* Retour au site */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-taupe-600 transition-colors hover:text-ink-900"
        >
          ← Retour au site
        </Link>

        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8 shadow-sm">

          {/* En-tête */}
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Cabinet OS
            </p>
            <h1 className="mt-3 font-serif text-3xl text-ink-900">
              Connexion
            </h1>
            <p className="mt-2 text-sm text-taupe-600">
              Espace client, coach et administration.
            </p>
          </div>

          {/* Alerte Supabase non configuré */}
          {!configured && (
            <p className="mb-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
              Supabase n&apos;est pas encore configuré. Renseigne{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              et{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-xs">
                NEXT_PUBLIC_SUPABASE_ANON_KEY
              </code>{" "}
              dans <code>.env.local</code>.
            </p>
          )}

          {/* Formulaire */}
          <form action={osSignIn} className="space-y-4">
            {/* Champ caché pour la redirection post-login */}
            {next && (
              <input type="hidden" name="next" value={next} />
            )}

            <LoginField
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
            />
            <LoginField
              name="password"
              type="password"
              label="Mot de passe"
              autoComplete="current-password"
              required
            />

            <button
              type="submit"
              disabled={!configured}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-taupe-700 px-5 py-3 text-sm font-medium text-sand-50 transition-all duration-300 hover:bg-taupe-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Se connecter →
            </button>
          </form>

          {/* Message d'erreur */}
          {errorLabel && (
            <div className="mt-4 space-y-2">
              <p className="rounded-2xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-800">
                {errorLabel}
              </p>
              {error === "unauthorized" && (
                <a
                  href="/os/coach"
                  className="block rounded-2xl border border-taupe-300/40 bg-sand-50 p-3 text-center text-sm text-taupe-700 hover:bg-taupe-50"
                >
                  → Accès direct espace coach (debug)
                </a>
              )}
            </div>
          )}

          {/* Séparateur */}
          <div className="mt-8 border-t border-taupe-300/30 pt-6">
            <p className="text-center text-xs text-taupe-400">
              Pas encore de compte ?{" "}
              <span className="text-taupe-600">
                Contactez votre coach.
              </span>
            </p>
          </div>
        </div>

        {/* Note de sécurité */}
        <p className="mt-4 text-center text-xs text-taupe-400">
          Espace sécurisé · Données personnelles protégées
        </p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Composant champ formulaire (identique au style admin existant)
// ─────────────────────────────────────────────────────────────

function LoginField({
  name,
  label,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="text-xs uppercase tracking-wider text-taupe-500"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="w-full rounded-full border border-taupe-300/50 bg-sand-50 px-5 py-3 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
      />
    </div>
  );
}
