import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadFaq } from "@/lib/content/faq.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Field, SubmitButton, Textarea } from "../_components/Fields";
import { faqAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · FAQ",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminFaqPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const faq = await loadFaq();
  const params = await searchParams;

  return (
    <AdminShell
      title="FAQ"
      intro="Questions affichées sur la page FAQ et utiles côté SEO. Une question par bloc."
    >
      <FlashMessages saved={params.saved} error={params.error} />

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
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">
          Ajouter une question
        </h2>
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
    </AdminShell>
  );
}
