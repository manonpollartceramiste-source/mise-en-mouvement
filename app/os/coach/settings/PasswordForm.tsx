"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { PasswordInput } from "@/app/components/ui/PasswordInput";

export default function PasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

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
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    setPassword("");
    setConfirm("");
  }

  if (success) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 text-sm text-emerald-800">
          Mot de passe mis à jour avec succès.
        </div>
        <button
          onClick={() => router.push("/os/coach")}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-taupe-700 px-5 py-3 text-sm font-medium text-sand-50 transition-all duration-300 hover:bg-taupe-800"
        >
          Retour au tableau de bord →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-xs uppercase tracking-wider text-taupe-500"
        >
          Nouveau mot de passe
        </label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="confirm"
          className="text-xs uppercase tracking-wider text-taupe-500"
        >
          Confirmer le mot de passe
        </label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {loading ? "Mise à jour…" : "Enregistrer le nouveau mot de passe →"}
      </button>
    </form>
  );
}
