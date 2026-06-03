"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteBilanButton({
  bilanId,
  clientId,
}: {
  bilanId: string;
  clientId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canConfirm = confirm === "SUPPRIMER";

  function close() {
    if (loading) return;
    setOpen(false);
  }

  async function handleDelete() {
    if (!canConfirm || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/os/bilans/${bilanId}`, { method: "DELETE" });
      const data: { ok: boolean; error?: string } = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Erreur inconnue.");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push(`/os/coach/clients/${clientId}`);
      }, 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setConfirm("");
          setError(null);
          setDone(false);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 hover:border-red-300"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
          <path
            fillRule="evenodd"
            d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
          />
        </svg>
        Supprimer ce bilan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={close}
        >
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />

          <div
            className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-4 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="font-medium text-ink-900">Bilan supprimé</p>
                <p className="mt-1 text-sm text-taupe-500">Retour à la fiche client…</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                  <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>

                <h3 className="font-serif text-xl text-ink-900">
                  Supprimer ce bilan&nbsp;?
                </h3>
                <p className="mt-2 text-sm text-taupe-600">
                  Cette action est <strong>irréversible</strong>. Seul ce bilan sera supprimé — le profil client et les autres bilans ne seront pas affectés.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-taupe-600">
                    Tapez{" "}
                    <span className="font-mono font-bold text-red-600">SUPPRIMER</span>{" "}
                    pour confirmer
                  </label>
                  <input
                    type="text"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDelete()}
                    placeholder="SUPPRIMER"
                    className="mt-1.5 w-full rounded-xl border border-taupe-300/60 bg-sand-50/50 px-4 py-2.5 font-mono text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-300"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-taupe-300/60 px-5 py-2.5 text-sm font-medium text-taupe-600 transition-colors hover:bg-sand-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={!canConfirm || loading}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:bg-red-700 disabled:opacity-40"
                  >
                    {loading ? "Suppression…" : "Supprimer définitivement"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
