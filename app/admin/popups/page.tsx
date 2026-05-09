import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadAllPopups } from "@/lib/content/popups.server";
import type { Popup } from "@/lib/content/popups";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SelectField,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import { popupAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Pop-ups",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

const scopeOptions = [
  { value: "home", label: "Accueil uniquement" },
  { value: "offres", label: "Offres uniquement" },
  { value: "both", label: "Accueil + Offres" },
];

export default async function AdminPopupsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const popups = await loadAllPopups();
  const params = await searchParams;

  return (
    <AdminShell
      title="Pop-ups"
      intro="Annonce ponctuelle, offre de lancement, info importante. Une seule pop-up active à la fois s’affichera sur la page ciblée."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-6">
        {popups.length === 0 && (
          <p className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6 text-sm text-taupe-600">
            Aucune pop-up pour le moment. Créez-en une ci-dessous.
          </p>
        )}
        {popups.map((p) => (
          <PopupEditor key={p.id} popup={p} />
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">
          Créer une pop-up
        </h2>
        <PopupForm />
      </article>
    </AdminShell>
  );
}

function PopupEditor({ popup }: { popup: Popup }) {
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink-900">{popup.title}</h2>
          <p className="mt-1 text-xs text-taupe-500">
            {popup.active ? "Active" : "Inactive"} · {popup.scope}
          </p>
        </div>
        <form action={popupAction}>
          <input type="hidden" name="op" value="delete" />
          <input type="hidden" name="id" value={popup.id} />
          <button
            type="submit"
            className="text-xs text-red-700 transition-colors hover:text-red-900"
          >
            Supprimer
          </button>
        </form>
      </header>
      <PopupForm popup={popup} />
    </article>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // YYYY-MM-DDTHH:MM (datetime-local format)
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PopupForm({ popup }: { popup?: Popup }) {
  return (
    <form action={popupAction} className="mt-4 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="op" value="upsert" />
      {popup && <input type="hidden" name="id" value={popup.id} />}

      <div className="md:col-span-2">
        <Field
          label="Titre"
          name="title"
          required
          defaultValue={popup?.title}
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          label="Texte"
          name="body"
          rows={3}
          defaultValue={popup?.body}
        />
      </div>
      <Field
        label="Libellé du bouton (optionnel)"
        name="ctaLabel"
        defaultValue={popup?.ctaLabel ?? ""}
      />
      <Field
        label="Lien du bouton (optionnel)"
        name="ctaHref"
        defaultValue={popup?.ctaHref ?? ""}
        placeholder="/offres ou https://..."
      />
      <SelectField
        label="Pages d’affichage"
        name="scope"
        defaultValue={popup?.scope ?? "home"}
        options={scopeOptions}
      />
      <Checkbox
        label="Active"
        name="active"
        defaultChecked={popup?.active ?? false}
      />
      <Field
        label="Date de début (optionnelle)"
        name="startsAt"
        type="datetime-local"
        defaultValue={toLocalInput(popup?.startsAt ?? null)}
      />
      <Field
        label="Date de fin (optionnelle)"
        name="endsAt"
        type="datetime-local"
        defaultValue={toLocalInput(popup?.endsAt ?? null)}
      />
      <div className="flex justify-end md:col-span-2">
        <SubmitButton>{popup ? "Enregistrer" : "Créer la pop-up"}</SubmitButton>
      </div>
    </form>
  );
}
