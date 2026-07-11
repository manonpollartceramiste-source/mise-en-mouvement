import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadFaq } from "@/lib/content/faq.server";
import { loadAllPopups } from "@/lib/content/popups.server";
import { loadTexts } from "@/lib/content/texts.server";
import { textFieldLabels, type SiteTexts } from "@/lib/content/texts";
import type { Popup } from "@/lib/content/popups";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SelectField,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import { faqAction } from "../faq/actions";
import { popupAction } from "../popups/actions";
import { saveTexts } from "../contenus/actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Contenu éditorial",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string; tab?: string }>;

const longFields: (keyof SiteTexts)[] = [
  "heroSubtitle",
  "approcheBody",
  "pilier1Body",
  "pilier2Body",
  "pilier3Body",
  "ctaFinalBody",
  "contactIntro",
  "contactBookingText",
  "reservationIntro",
];

const scopeOptions = [
  { value: "home", label: "Accueil uniquement" },
  { value: "offres", label: "Offres uniquement" },
  { value: "both", label: "Accueil + Offres" },
];

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-ink-900 text-sand-50"
          : "text-taupe-600 hover:bg-sand-50 hover:text-ink-900"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function AdminContenuPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const params = await searchParams;
  const activeTab = params.tab ?? "faq";

  const [faq, popups, texts] = await Promise.all([
    activeTab === "faq" ? loadFaq() : Promise.resolve([] as Awaited<ReturnType<typeof loadFaq>>),
    activeTab === "popups" ? loadAllPopups() : Promise.resolve([] as Popup[]),
    activeTab === "textes" ? loadTexts() : Promise.resolve(null as Awaited<ReturnType<typeof loadTexts>> | null),
  ]);

  return (
    <AdminShell
      title="Contenu éditorial"
      intro="FAQ, pop-ups et textes du site."
    >
      {/* Onglets */}
      <div className="mb-8 flex gap-1 rounded-2xl border border-taupe-200/50 bg-white p-1.5 w-fit">
        <TabLink href="/admin/contenu" active={activeTab === "faq"}>
          FAQ
        </TabLink>
        <TabLink href="/admin/contenu?tab=popups" active={activeTab === "popups"}>
          Pop-ups
        </TabLink>
        <TabLink href="/admin/contenu?tab=textes" active={activeTab === "textes"}>
          Textes du site
        </TabLink>
      </div>

      <FlashMessages saved={params.saved} error={params.error} />

      {/* ─── Tab : FAQ ──────────────────────────────────────────── */}
      {activeTab === "faq" && (
        <div className="space-y-6">
          {faq.map((item, index) => (
            <article
              key={index}
              className="rounded-2xl border border-taupe-300/40 bg-white p-6"
            >
              <header className="mb-4 flex items-center justify-between gap-4">
                <span className="text-xs uppercase tracking-wider text-taupe-500">
                  Question {index + 1}
                </span>
                <form action={faqAction}>
                  <input type="hidden" name="op" value="delete" />
                  <input type="hidden" name="index" value={index} />
                  <button
                    type="submit"
                    className="text-xs text-red-700 transition-colors hover:text-red-900"
                  >
                    Supprimer
                  </button>
                </form>
              </header>
              <form action={faqAction} className="grid gap-4">
                <input type="hidden" name="op" value="upsert" />
                <input type="hidden" name="index" value={index} />
                <Field
                  label="Question"
                  name="question"
                  defaultValue={item.question}
                  required
                />
                <Textarea
                  label="Réponse"
                  name="answer"
                  defaultValue={item.answer}
                  rows={3}
                />
                <div className="flex justify-end">
                  <SubmitButton />
                </div>
              </form>
            </article>
          ))}

          <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
            <h2 className="font-serif text-xl text-ink-900">Ajouter une question</h2>
            <form action={faqAction} className="mt-4 grid gap-4">
              <input type="hidden" name="op" value="upsert" />
              <input type="hidden" name="index" value="" />
              <Field label="Question" name="question" required />
              <Textarea label="Réponse" name="answer" rows={3} />
              <div className="flex justify-end">
                <SubmitButton>Ajouter →</SubmitButton>
              </div>
            </form>
          </article>
        </div>
      )}

      {/* ─── Tab : Pop-ups ──────────────────────────────────────── */}
      {activeTab === "popups" && (
        <div>
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
            <h2 className="font-serif text-xl text-ink-900">Créer une pop-up</h2>
            <PopupForm />
          </article>
        </div>
      )}

      {/* ─── Tab : Textes du site ───────────────────────────────── */}
      {activeTab === "textes" && texts && (
        <form
          action={saveTexts}
          className="space-y-5 rounded-2xl border border-taupe-300/40 bg-white p-6"
        >
          {(Object.keys(textFieldLabels) as (keyof SiteTexts)[]).map((k) =>
            longFields.includes(k) ? (
              <Textarea
                key={k}
                label={textFieldLabels[k]}
                name={k}
                defaultValue={texts[k]}
                rows={4}
              />
            ) : (
              <Field
                key={k}
                label={textFieldLabels[k]}
                name={k}
                defaultValue={texts[k]}
              />
            )
          )}
          <div className="flex justify-end pt-2">
            <SubmitButton>Enregistrer les textes →</SubmitButton>
          </div>
        </form>
      )}
    </AdminShell>
  );
}

// ── PopupEditor ──────────────────────────────────────────────────

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
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PopupForm({ popup }: { popup?: Popup }) {
  return (
    <form action={popupAction} className="mt-4 grid gap-4 md:grid-cols-2">
      <input type="hidden" name="op" value="upsert" />
      {popup && <input type="hidden" name="id" value={popup.id} />}

      <div className="md:col-span-2">
        <Field label="Titre" name="title" required defaultValue={popup?.title} />
      </div>
      <div className="md:col-span-2">
        <Textarea label="Texte" name="body" rows={3} defaultValue={popup?.body} />
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
        label="Pages d'affichage"
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
