"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function CoachActivationPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.replace("/os/coach");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 px-6">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-taupe-300/40 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
              Cabinet OS
            </p>
            <h1 className="mt-3 font-serif text-3xl text-ink-900">
              Bienvenue !
            </h1>
            <p className="mt-2 text-sm text-taupe-600">
              Choisissez un mot de passe pour accéder à votre espace coach.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs uppercase tracking-wider text-taupe-500"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-full border border-taupe-300/50 bg-sand-50 px-5 py-3 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="confirm"
                className="text-xs uppercase tracking-wider text-taupe-500"
              >
                Confirmer le mot de passe
              </label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-full border border-taupe-300/50 bg-sand-50 px-5 py-3 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
              />
            </div>

            {error && (
              <p className="rounded-2xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-taupe-700 px-5 py-3 text-sm font-medium text-sand-50 transition-all duration-300 hover:bg-taupe-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Activation…" : "Activer mon compte →"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-taupe-400">
          Espace sécurisé · Données personnelles protégées
        </p>
      </div>
    </main>
  );
}
