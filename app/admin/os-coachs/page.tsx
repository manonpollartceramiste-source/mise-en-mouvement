import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAllOsCoaches } from "@/lib/supabase/admin-actions";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import type { Profile } from "@/lib/os/types";
import {
  createCoachAction,
  updateCoachAction,
  setCoachPasswordAction,
  resendCoachInviteAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · OS Coachs",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminOsCoachsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) redirect("/admin/login?error=supabase-missing");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const coaches = await getAllOsCoaches();
  const params = await searchParams;

  return (
    <AdminShell
      title="Comptes coachs OS"
      intro="Invitez de nouveaux coachs par email. Ils reçoivent un lien pour définir leur mot de passe et accéder à l'espace coach."
    >
      <div className="mb-8">
        <Link
          href="/os/coach"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 bg-white px-5 py-2.5 text-sm font-medium text-ink-900 transition-all duration-300 hover:border-taupe-400/70 hover:shadow-sm"
        >
          Voir l&apos;espace coach <span aria-hidden>↗</span>
        </Link>
      </div>
      <FlashMessages saved={params.saved} error={params.error} />

      {coaches.length > 0 && (
        <div className="mb-10 space-y-4">
          <h2 className="font-serif text-xl text-ink-900">
            Coachs ({coaches.length})
          </h2>
          <div className="space-y-4">
            {coaches.map((coach) => (
              <CoachEditor key={coach.id} coach={coach} />
            ))}
          </div>
        </div>
      )}

      <article className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">
          Inviter un nouveau coach
        </h2>
        <p className="mt-1 text-sm text-taupe-600">
          Un email d&apos;invitation sera envoyé automatiquement.
        </p>
        <form
          action={createCoachAction}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <Field
            label="Email"
            name="email"
            type="email"
            required
            placeholder="coach@exemple.com"
          />
          <Field
            label="Nom complet"
            name="display_name"
            required
            placeholder="Marie Dupont"
          />
          <Field
            label="Téléphone (optionnel)"
            name="phone"
            placeholder="+33 6 00 00 00 00"
          />
          <div className="md:col-span-1" />
          <Field
            label="Lien SumUp (optionnel)"
            name="sumup_url"
            type="url"
            placeholder="https://pay.sumup.com/..."
          />
          <div className="md:col-span-2">
            <Textarea label="Bio (optionnel)" name="bio" rows={3} />
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton>Inviter le coach →</SubmitButton>
          </div>
        </form>
      </article>
    </AdminShell>
  );
}

function CoachEditor({ coach }: { coach: Profile }) {
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl text-ink-900">
            {coach.display_name}
          </h3>
          <p className="text-xs text-taupe-500">{coach.email}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            coach.active
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {coach.active ? "Actif" : "Inactif"}
        </span>
      </div>

      <form
        action={updateCoachAction}
        className="grid gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="id" value={coach.id} />
        <Field
          label="Nom complet"
          name="display_name"
          defaultValue={coach.display_name}
          required
        />
        <Field
          label="Téléphone"
          name="phone"
          defaultValue={coach.phone ?? ""}
        />
        <Field
          label="Lien SumUp"
          name="sumup_url"
          type="url"
          defaultValue={coach.sumup_url ?? ""}
          placeholder="https://pay.sumup.com/..."
        />
        <div className="md:col-span-2">
          <Textarea
            label="Bio"
            name="bio"
            defaultValue={coach.bio ?? ""}
            rows={3}
          />
        </div>
        <div className="md:col-span-2">
          <Checkbox
            label="Compte actif"
            name="active"
            defaultChecked={coach.active}
          />
        </div>
        <div className="flex justify-end md:col-span-2">
          <SubmitButton />
        </div>
      </form>

      {/* ── Actions d'accès ── */}
      <div className="mt-6 border-t border-taupe-200/40 pt-5 space-y-5">
        {/* Renvoyer l'invitation email */}
        <form action={resendCoachInviteAction} className="flex items-center gap-4">
          <input type="hidden" name="email" value={coach.email} />
          <div className="flex-1">
            <p className="text-xs font-medium text-taupe-700">Renvoyer l&apos;invitation</p>
            <p className="text-xs text-taupe-400">
              Envoie un nouvel email d&apos;invitation pour que le coach définisse son mot de passe.
            </p>
          </div>
          <SubmitButton>Renvoyer →</SubmitButton>
        </form>

        {/* Définir un mot de passe temporaire */}
        <form action={setCoachPasswordAction} className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 space-y-3">
          <input type="hidden" name="id" value={coach.id} />
          <div>
            <p className="text-xs font-medium text-amber-900">
              Définir / réinitialiser le mot de passe
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Choisissez un mot de passe temporaire et communiquez-le au coach par SMS / WhatsApp.
            </p>
          </div>
          <div className="flex gap-3 items-end">
            <label className="flex-1 block space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-taupe-500">Mot de passe temporaire</span>
              <input
                name="password"
                type="text"
                required
                minLength={8}
                placeholder="Min. 8 caractères"
                className="w-full rounded-xl border border-taupe-300/50 bg-white px-3 py-2 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
              />
            </label>
            <SubmitButton>Définir →</SubmitButton>
          </div>
        </form>
      </div>
    </article>
  );
}
