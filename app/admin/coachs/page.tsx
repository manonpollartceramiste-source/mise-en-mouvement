import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadCoaches } from "@/lib/content/coaches.server";
import type { Coach } from "@/lib/content/coaches";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import { coachAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Coachs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminCoachsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const coaches = await loadCoaches();
  const params = await searchParams;

  return (
    <AdminShell
      title="Coachs"
      intro="Modifie les profils existants ou ajoute un nouveau coach (l’identifiant doit être unique, en minuscules et sans espace)."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-6">
        {coaches.map((coach) => (
          <CoachEditor key={coach.id} coach={coach} canDelete={coaches.length > 1} />
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">Ajouter un coach</h2>
        <p className="mt-1 text-sm text-taupe-600">
          Identifiant unique en minuscules (ex: <code>marc</code>).
        </p>
        <form action={coachAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="op" value="upsert" />
          <Field label="Identifiant" name="id" required placeholder="ex: marc" />
          <Field label="Nom complet" name="name" required />
          <Field label="Initiales" name="initials" required placeholder="MD" />
          <Field label="Rôle court" name="shortRole" required placeholder="Pilates & yoga" />
          <div className="md:col-span-2">
            <Field label="Rôle complet" name="role" required />
          </div>
          <div className="md:col-span-2">
            <Field label="Diplôme(s)" name="diploma" required />
          </div>
          <div className="md:col-span-2">
            <Textarea label="Bio" name="bio" rows={4} />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Points forts (un par ligne)"
              name="highlights"
              rows={3}
            />
          </div>
          <Field
            label="URL Cal.com"
            name="calcomUrl"
            type="url"
            placeholder="https://cal.com/..."
            required
          />
          <Field
            label="Lien SumUp principal (optionnel)"
            name="sumupUrl"
            type="url"
            placeholder="https://pay.sumup.com/..."
          />
          <div className="md:col-span-2">
            <Checkbox label="Coach actif (visible côté public)" name="active" defaultChecked />
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton>Ajouter le coach →</SubmitButton>
          </div>
        </form>
      </article>
    </AdminShell>
  );
}

function CoachEditor({
  coach,
  canDelete,
}: {
  coach: Coach;
  canDelete: boolean;
}) {
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-ink-900">{coach.name}</h2>
          <code className="text-xs text-taupe-500">{coach.id}</code>
        </div>
        {canDelete && (
          <form action={coachAction}>
            <input type="hidden" name="op" value="delete" />
            <input type="hidden" name="id" value={coach.id} />
            <button
              type="submit"
              className="text-xs text-red-700 transition-colors hover:text-red-900"
            >
              Supprimer
            </button>
          </form>
        )}
      </header>

      <form action={coachAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="op" value="upsert" />
        <input type="hidden" name="id" value={coach.id} />
        <Field label="Nom complet" name="name" defaultValue={coach.name} required />
        <Field label="Initiales" name="initials" defaultValue={coach.initials} required />
        <Field
          label="Rôle court"
          name="shortRole"
          defaultValue={coach.shortRole}
          required
        />
        <Field label="Rôle complet" name="role" defaultValue={coach.role} required />
        <div className="md:col-span-2">
          <Field
            label="Diplôme(s)"
            name="diploma"
            defaultValue={coach.diploma}
            required
          />
        </div>
        <div className="md:col-span-2">
          <Textarea label="Bio" name="bio" defaultValue={coach.bio} rows={4} />
        </div>
        <div className="md:col-span-2">
          <Textarea
            label="Points forts (un par ligne)"
            name="highlights"
            defaultValue={coach.highlights.join("\n")}
            rows={3}
          />
        </div>
        <Field
          label="URL Cal.com"
          name="calcomUrl"
          type="url"
          defaultValue={coach.calcomUrl}
          required
        />
        <Field
          label="Lien SumUp principal (optionnel)"
          name="sumupUrl"
          type="url"
          defaultValue={coach.sumupUrl ?? ""}
        />
        <div className="md:col-span-2">
          <Checkbox
            label="Coach actif (visible côté public)"
            name="active"
            defaultChecked={coach.active !== false}
          />
        </div>
        <div className="flex justify-end md:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </article>
  );
}
