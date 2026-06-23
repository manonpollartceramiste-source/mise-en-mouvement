import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getPrestations } from "@/lib/billing/server";
import { OsShell } from "@/app/os/_components/OsShell";
import { DeleteButton } from "@/app/os/coach/_components/DeleteButton";
import { fmtEur } from "@/lib/billing/types";
import {
  createPrestationAction,
  updatePrestationAction,
  togglePrestationAction,
  deletePrestationAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Prestations · Coach",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; deleted?: string; edit?: string }>;

export default async function PrestationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await getOsProfileWithRole("coach");
  if (!profile) redirect("/os/login");

  const { saved, deleted, edit } = await searchParams;
  const prestations = await getPrestations(profile.id);

  const editPrestation = edit ? prestations.find((p) => p.id === edit) : null;

  const categories = [...new Set(prestations.map((p) => p.category).filter(Boolean))] as string[];

  return (
    <OsShell profile={profile} title="Bibliothèque de prestations">
      {saved && (
        <div className="mb-5 rounded-xl bg-green-50 px-5 py-3 text-sm text-green-700">
          Prestation enregistrée.
        </div>
      )}
      {deleted && (
        <div className="mb-5 rounded-xl bg-sand-100 px-5 py-3 text-sm text-taupe-700">
          Prestation supprimée.
        </div>
      )}

      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">Cabinet OS</p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Bibliothèque de prestations</h2>
        <p className="mt-1 text-sm text-taupe-500">
          Créez des modèles réutilisables dans vos devis et factures.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Formulaire création / modification */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-taupe-300/40 bg-white p-6">
            <h3 className="mb-5 font-serif text-xl text-ink-900">
              {editPrestation ? "Modifier" : "Nouvelle prestation"}
            </h3>
            <form
              action={editPrestation ? updatePrestationAction : createPrestationAction}
              className="space-y-4"
            >
              {editPrestation && (
                <input type="hidden" name="id" value={editPrestation.id} />
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Nom *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editPrestation?.name ?? ""}
                  placeholder="Ex : Séance coaching individuelle"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editPrestation?.description ?? ""}
                  placeholder="Description courte (optionnel)"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">Prix HT (€)</label>
                  <input
                    type="number"
                    name="unit_price"
                    min={0}
                    step={0.01}
                    defaultValue={editPrestation?.unit_price ?? 0}
                    className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-taupe-600">TVA (%)</label>
                  <input
                    type="number"
                    name="tva_pct"
                    min={0}
                    max={100}
                    step={0.1}
                    defaultValue={editPrestation?.tva_pct ?? 0}
                    className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Catégorie</label>
                <input
                  type="text"
                  name="category"
                  defaultValue={editPrestation?.category ?? ""}
                  placeholder="Ex : Coaching, Formation, Bilan…"
                  list="categories-list"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
                {categories.length > 0 && (
                  <datalist id="categories-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                {editPrestation && (
                  <a
                    href="/os/coach/prestations"
                    className="flex-1 rounded-xl border border-taupe-300/50 px-4 py-2.5 text-center text-sm font-medium text-taupe-700 transition-colors hover:bg-sand-100"
                  >
                    Annuler
                  </a>
                )}
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-ink-900 px-4 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
                >
                  {editPrestation ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Liste des prestations */}
        <div className="lg:col-span-2">
          {prestations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-12 text-center">
              <p className="font-serif text-2xl text-ink-900">Bibliothèque vide</p>
              <p className="mt-3 text-sm text-taupe-500">
                Créez votre première prestation pour la réutiliser dans vos devis et factures.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {prestations.map((p) => (
                <div
                  key={p.id}
                  className={`rounded-2xl border bg-white p-5 transition-colors ${
                    p.is_active ? "border-taupe-300/40" : "border-taupe-300/20 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-ink-900">{p.name}</p>
                        {p.category && (
                          <span className="rounded-full bg-sand-100 px-2 py-0.5 text-xs text-taupe-600">
                            {p.category}
                          </span>
                        )}
                        {!p.is_active && (
                          <span className="rounded-full bg-taupe-200 px-2 py-0.5 text-xs text-taupe-600">
                            Inactif
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-1 text-sm text-taupe-500">{p.description}</p>
                      )}
                      <p className="mt-2 text-sm font-medium text-ink-900">
                        {fmtEur(p.unit_price)} HT
                        {Number(p.tva_pct) > 0 && (
                          <span className="ml-1.5 text-xs font-normal text-taupe-500">
                            · TVA {p.tva_pct}%
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={togglePrestationAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="is_active" value={String(p.is_active)} />
                        <button
                          type="submit"
                          className="rounded-lg border border-taupe-300/50 px-3 py-1.5 text-xs font-medium text-taupe-600 transition-colors hover:bg-sand-100"
                        >
                          {p.is_active ? "Désactiver" : "Activer"}
                        </button>
                      </form>
                      <a
                        href={`/os/coach/prestations?edit=${p.id}`}
                        className="rounded-lg border border-taupe-300/50 px-3 py-1.5 text-xs font-medium text-taupe-600 transition-colors hover:bg-sand-100"
                      >
                        Modifier
                      </a>
                      <form action={deletePrestationAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <DeleteButton
                          confirmMessage={`Supprimer "${p.name}" ?`}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Supprimer
                        </DeleteButton>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </OsShell>
  );
}
