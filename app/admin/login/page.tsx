import type { Metadata } from "next";
import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { signIn } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion admin",
  robots: { index: false, follow: false },
};

const errorMessages: Record<string, string> = {
  "supabase-missing":
    "La base Supabase n’est pas encore configurée sur ce site.",
  "missing-fields": "Email et mot de passe requis.",
};

type SearchParams = Promise<{ error?: string }>;

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error } = await searchParams;
  const configured = isSupabaseConfigured();
  const errorLabel = error
    ? errorMessages[error] ?? decodeURIComponent(error)
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-taupe-600 transition-colors hover:text-ink-900"
        >
          ← Retour au site
        </Link>

        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8 shadow-sm">
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Espace admin
          </p>
          <h1 className="mt-3 font-serif text-3xl text-ink-900">Connexion</h1>
          <p className="mt-2 text-sm text-taupe-600">
            Réservé à l’administration du cabinet.
          </p>

          {!configured && (
            <p className="mt-6 rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-sm text-amber-900">
              Supabase n’est pas encore configuré. Renseigne{" "}
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

          <form action={signIn} className="mt-6 space-y-4">
            <Field
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              required
            />
            <Field
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

          {errorLabel && (
            <p className="mt-4 rounded-2xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-800">
              {errorLabel}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({
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
