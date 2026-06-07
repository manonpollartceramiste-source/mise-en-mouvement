import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { type Offer } from "@/lib/content/offers";
import { loadOffers } from "@/lib/content/offers.server";
import { loadCoaches } from "@/lib/content/coaches.server";
import type { Coach } from "@/lib/content/coaches";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SelectField,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import { createOffer, deleteOffer, saveOffer } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Offres",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminOffresPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [offers, coaches] = await Promise.all([loadOffers(), loadCoaches()]);
  const params = await searchParams;

  return (
    <AdminShell
      title="Offres"
      intro="Modifie, ajoute ou supprime des offres. Pour chaque coach, configure le lien SumUp et le fallback Cal.com. Si « tous » est coché, l'offre est proposée pour tous les coachs."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-6">
        {offers.map((offer) => (
          <OfferEditor key={offer.id} offer={offer} coaches={coaches} />
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">Ajouter une offre</h2>
        <p className="mt-1 text-sm text-taupe-600">
          Identifiant unique en minuscules (ex: <code>seance-zoom</code>).
        </p>
        <OfferForm action={createOffer} coaches={coaches} />
      </article>
    </AdminShell>
  );
}

function OfferEditor({
  offer,
  coaches,
}: {
  offer: Offer;
  coaches: Coach[];
}) {
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink-900">{offer.name}</h2>
          <code className="text-xs text-taupe-500">{offer.id}</code>
        </div>
        <form action={deleteOffer}>
          <input type="hidden" name="id" value={offer.id} />
          <button
            type="submit"
            className="text-xs text-red-700 transition-colors hover:text-red-900"
          >
            Supprimer
          </button>
        </form>
      </header>
      <OfferForm action={saveOffer} coaches={coaches} offer={offer} />
    </article>
  );
}

function OfferForm({
  action,
  coaches,
  offer,
}: {
  action: (formData: FormData) => Promise<void>;
  coaches: Coach[];
  offer?: Offer;
}) {
  const isCreate = !offer;
  const allCoachesAllowed = !offer || offer.allowedCoaches.length === 0;
  return (
    <form action={action} className="mt-6 grid gap-4 md:grid-cols-2">
      {!isCreate && <input type="hidden" name="id" value={offer.id} />}
      {isCreate && (
        <Field
          label="Identifiant (slug)"
          name="id"
          required
          placeholder="seance-zoom"
        />
      )}
      <Field label="Nom" name="name" required defaultValue={offer?.name} />
      <SelectField
        label="Catégorie"
        name="category"
        defaultValue={offer?.category ?? "ponctuelle"}
        options={[
          { value: "ponctuelle", label: "Ponctuelle" },
          { value: "carte", label: "Carte" },
          { value: "programme", label: "Programme" },
        ]}
      />
      <Field
        label="Prix affiché (libellé)"
        name="priceLabel"
        required
        defaultValue={offer?.priceLabel}
      />
      <Field
        label="Montant TOTAL en centimes (vide = sur devis)"
        name="totalCents"
        type="number"
        defaultValue={offer?.totalCents?.toString() ?? ""}
      />
      <Field
        label="Durée"
        name="duration"
        defaultValue={offer?.duration ?? ""}
        placeholder="60 min"
      />
      <Field
        label="Nombre de personnes (optionnel)"
        name="participants"
        type="number"
        defaultValue={offer?.participants?.toString() ?? ""}
      />
      <div className="md:col-span-2">
        <Field
          label="Description"
          name="description"
          defaultValue={offer?.description}
        />
      </div>
      <div className="md:col-span-2">
        <Textarea
          label="Détails (un par ligne)"
          name="details"
          defaultValue={offer?.details.join("\n")}
          rows={4}
        />
      </div>
      <Field
        label="Badge (optionnel)"
        name="badge"
        defaultValue={offer?.badge ?? ""}
      />
      <div className="md:col-span-2">
        <Checkbox
          label="Mettre en avant (highlight)"
          name="highlight"
          defaultChecked={Boolean(offer?.highlight)}
        />
      </div>

      <fieldset className="rounded-xl border border-taupe-300/40 bg-sand-100/30 p-4 md:col-span-2">
        <legend className="px-2 text-xs uppercase tracking-wider text-taupe-500">
          Coachs &amp; liens de paiement
        </legend>
        <Checkbox
          label="Disponible pour tous les coachs (ignore les cases ci-dessous)"
          name="allow_all"
          defaultChecked={allCoachesAllowed}
        />
        <div className="mt-5 space-y-5">
          {coaches.map((c) => {
            const link = offer?.coachLinks[c.id];
            const allowed = offer?.allowedCoaches.includes(c.id) ?? false;
            return (
              <div
                key={c.id}
                className="rounded-xl bg-white p-4 ring-1 ring-taupe-300/30"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-serif text-base text-ink-900">{c.name}</p>
                  <code className="text-xs text-taupe-500">{c.id}</code>
                </div>
                <Checkbox
                  label="Autorisé pour cette offre (si « tous » est décoché)"
                  name={`coach_${c.id}_allowed`}
                  defaultChecked={allowed}
                />
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field
                    label="Lien SumUp"
                    name={`coach_${c.id}_sumup`}
                    type="url"
                    defaultValue={link?.sumup ?? ""}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="flex justify-end md:col-span-2">
        <SubmitButton>
          {isCreate ? "Créer l'offre →" : "Enregistrer →"}
        </SubmitButton>
      </div>
    </form>
  );
}
