"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-xl border border-taupe-300/60 bg-sand-50/50 px-4 py-3 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none focus:ring-1 focus:ring-taupe-500/30";

export function NewClientModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    goal: "",
    notes: "",
  });

  function reset() {
    setForm({ first_name: "", last_name: "", email: "", phone: "", goal: "", notes: "" });
    setError(null);
    setSuccess(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/os/clients/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const result: { ok: boolean; error?: string } = await res.json();
        if (!result.ok) {
          setError(result.error ?? "Erreur inconnue.");
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/os/coach/clients");
            router.refresh();
          }, 1200);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erreur serveur inattendue.";
        setError(msg);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
      >
        + Nouveau client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
            onClick={close}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-taupe-300/40 bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-ink-900">
                  Nouveau client
                </h3>
                <p className="mt-0.5 text-xs text-taupe-400">
                  Le client recevra un lien pour définir son mot de passe.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-taupe-400 transition-colors hover:bg-sand-100 hover:text-ink-900"
              >
                ✕
              </button>
            </div>

            {success ? (
              <div className="rounded-xl bg-emerald-50 px-4 py-5 text-center">
                <p className="font-medium text-emerald-700">
                  ✓ Client créé avec succès
                </p>
                <p className="mt-1 text-xs text-emerald-600">
                  La liste se rafraîchit…
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      value={form.first_name}
                      onChange={(e) => set("first_name", e.target.value)}
                      placeholder="Marie"
                      className={inputCls}
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                      Nom *
                    </label>
                    <input
                      type="text"
                      value={form.last_name}
                      onChange={(e) => set("last_name", e.target.value)}
                      placeholder="Dupont"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="marie.dupont@email.com"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                    Objectif principal
                  </label>
                  <input
                    type="text"
                    value={form.goal}
                    onChange={(e) => set("goal", e.target.value)}
                    placeholder="Perdre du poids, améliorer la posture…"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-taupe-600">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Blessures, disponibilités, informations utiles…"
                    rows={3}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-taupe-300/60 px-5 py-2.5 text-sm font-medium text-taupe-600 transition-colors hover:bg-sand-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending || !form.first_name || !form.last_name || !form.email}
                    className="rounded-xl bg-ink-900 px-5 py-2.5 text-sm font-medium text-sand-50 transition-opacity hover:opacity-80 disabled:opacity-40"
                  >
                    {isPending ? "Création…" : "Créer le client"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
