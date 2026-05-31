import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadTestimonials } from "@/lib/content/testimonials.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Field,
  Textarea,
  SelectField,
  Checkbox,
  SubmitButton,
} from "../_components/Fields";
import { avisAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Avis clients",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

const ratingOptions = [
  { value: "5", label: "★★★★★  (5/5)" },
  { value: "4", label: "★★★★☆  (4/5)" },
  { value: "3", label: "★★★☆☆  (3/5)" },
  { value: "2", label: "★★☆☆☆  (2/5)" },
  { value: "1", label: "★☆☆☆☆  (1/5)" },
];

export default async function AdminAvisPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const avis = await loadTestimonials();
  const params = await searchParams;

  return (
    <AdminShell
      title="Avis clients"
      intro="Gérez les témoignages affichés sur la page avis et l'accueil. Seuls les avis visibles apparaissent sur le site."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-6">
        {avis.map((item, index) => (
          <article
            key={index}
            className="rounded-2xl border border-taupe-300/40 bg-white p-6"
          >
            <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wider text-taupe-500">
                  Avis {index + 1}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${
                    item.visible
                      ? "border-emerald-300/60 bg-emerald-50 text-emerald-700"
                      : "border-taupe-300/40 bg-sand-100 text-taupe-500"
                  }`}
                >
                  {item.visible ? "Visible" : "Masqué"}
                </span>
              </div>

              <div className="flex items-center gap-4">
                {index > 0 && (
                  <form action={avisAction}>
                    <input type="hidden" name="op" value="moveUp" />
                    <input type="hidden" name="index" value={index} />
                    <button
                      type="submit"
                      title="Monter"
                      className="text-sm text-taupe-500 transition-colors hover:text-ink-900"
                    >
                      ↑
                    </button>
                  </form>
                )}
                {index < avis.length - 1 && (
                  <form action={avisAction}>
                    <input type="hidden" name="op" value="moveDown" />
                    <input type="hidden" name="index" value={index} />
                    <button
                      type="submit"
                      title="Descendre"
                      className="text-sm text-taupe-500 transition-colors hover:text-ink-900"
                    >
                      ↓
                    </button>
                  </form>
                )}
                <form action={avisAction}>
                  <input type="hidden" name="op" value="toggleVisible" />
                  <input type="hidden" name="index" value={index} />
                  <button
                    type="submit"
                    className="text-xs text-taupe-600 transition-colors hover:text-ink-900"
                  >
                    {item.visible ? "Masquer" : "Rendre visible"}
                  </button>
                </form>
                <form action={avisAction}>
                  <input type="hidden" name="op" value="delete" />
                  <input type="hidden" name="index" value={index} />
                  <button
                    type="submit"
                    className="text-xs text-red-700 transition-colors hover:text-red-900"
                  >
                    Supprimer
                  </button>
                </form>
              </div>
            </header>

            <form action={avisAction} className="grid gap-4">
              <input type="hidden" name="op" value="upsert" />
              <input type="hidden" name="index" value={index} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Auteur affiché"
                  name="author"
                  defaultValue={item.author}
                  required
                  placeholder="ex : Sophie M."
                />
                <SelectField
                  label="Note"
                  name="rating"
                  defaultValue={String(item.rating)}
                  options={ratingOptions}
                />
              </div>

              <Textarea
                label="Texte de l'avis"
                name="quote"
                defaultValue={item.quote}
                rows={3}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Contexte (facultatif)"
                  name="context"
                  defaultValue={item.context ?? ""}
                  placeholder="ex : coaching, pilates, reprise du sport…"
                />
                <Field
                  label="Date (facultatif)"
                  name="date"
                  defaultValue={item.date ?? ""}
                  placeholder="ex : Avril 2025"
                />
              </div>

              <div className="flex items-center justify-between">
                <Checkbox
                  label="Visible sur le site"
                  name="visible"
                  defaultChecked={item.visible}
                />
                <SubmitButton />
              </div>
            </form>
          </article>
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">Ajouter un avis</h2>
        <form action={avisAction} className="mt-4 grid gap-4">
          <input type="hidden" name="op" value="upsert" />
          <input type="hidden" name="index" value="" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Auteur affiché"
              name="author"
              required
              placeholder="ex : Sophie M."
            />
            <SelectField
              label="Note"
              name="rating"
              defaultValue="5"
              options={ratingOptions}
            />
          </div>

          <Textarea
            label="Texte de l'avis"
            name="quote"
            rows={3}
            placeholder="Saisir le témoignage client…"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Contexte (facultatif)"
              name="context"
              placeholder="ex : coaching, pilates, reprise du sport…"
            />
            <Field
              label="Date (facultatif)"
              name="date"
              placeholder="ex : Avril 2025"
            />
          </div>

          <div className="flex items-center justify-between">
            <Checkbox
              label="Visible sur le site"
              name="visible"
              defaultChecked={true}
            />
            <SubmitButton>Ajouter →</SubmitButton>
          </div>
        </form>
      </article>
    </AdminShell>
  );
}
