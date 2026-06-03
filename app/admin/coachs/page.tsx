import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadCoaches } from "@/lib/content/coaches.server";
import type { Coach } from "@/lib/content/coaches";
import {
  getOsCoachesStatus,
  type OsCoachStatus,
} from "@/lib/supabase/admin-actions";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SubmitButton,
  Textarea,
} from "../_components/Fields";
import {
  coachAction,
  createOsAccountAction,
  linkExistingOsAccountAction,
  resendInviteAction,
  toggleOsAccessAction,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Coachs du site",
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

  const profileIds = coaches
    .map((c) => c.osProfileId)
    .filter((id): id is string => Boolean(id));

  let osStatuses: Record<string, OsCoachStatus> = {};
  try {
    osStatuses = await getOsCoachesStatus(profileIds);
  } catch {
    // Service role non configuré — affichage sans statut OS
  }

  return (
    <AdminShell
      title="Coachs du site"
      intro="Gérez les profils publics et les accès Cabinet OS depuis une seule interface."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-8">
        {coaches.map((coach) => (
          <CoachCard
            key={coach.id}
            coach={coach}
            canDelete={coaches.length > 1}
            osStatus={
              coach.osProfileId ? osStatuses[coach.osProfileId] : undefined
            }
          />
        ))}
      </div>

      <article className="mt-10 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">Ajouter un coach</h2>
        <p className="mt-1 text-sm text-taupe-600">
          Identifiant unique en minuscules (ex&nbsp;:{" "}
          <code className="rounded bg-sand-100 px-1 py-0.5 text-xs">marc</code>
          ). Si un email OS est renseigné, une invitation est envoyée
          automatiquement.
        </p>
        <form action={coachAction} className="mt-6 grid gap-4 md:grid-cols-2">
          <input type="hidden" name="op" value="upsert" />
          <Field
            label="Identifiant"
            name="id"
            required
            placeholder="ex: marc"
          />
          <Field label="Nom complet" name="name" required />
          <Field
            label="Initiales"
            name="initials"
            required
            placeholder="MD"
          />
          <Field
            label="Rôle court"
            name="shortRole"
            required
            placeholder="Pilates & yoga"
          />
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
            label="Lien SumUp (optionnel)"
            name="sumupUrl"
            type="url"
            placeholder="https://pay.sumup.com/..."
          />
          <Field label="SIRET (mentions légales)" name="siret" />
          <Field label="Rôle légal (mentions légales)" name="legalRole" />
          <Field
            label="Email professionnel (mentions légales)"
            name="proEmail"
            type="email"
          />
          <Field
            label="Email de connexion OS (optionnel — envoie une invitation)"
            name="email"
            type="email"
            placeholder="coach@exemple.com"
          />
          <div className="md:col-span-2">
            <Checkbox
              label="Coach actif (visible côté public)"
              name="active"
              defaultChecked
            />
          </div>
          <div className="flex justify-end md:col-span-2">
            <SubmitButton>Ajouter le coach →</SubmitButton>
          </div>
        </form>
      </article>
    </AdminShell>
  );
}

// ─── Coach card ───────────────────────────────────────────────────────────────

function CoachCard({
  coach,
  canDelete,
  osStatus,
}: {
  coach: Coach;
  canDelete: boolean;
  osStatus: OsCoachStatus | undefined;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-taupe-200/60 px-6 py-5">
        <div>
          <h2 className="font-serif text-xl text-ink-900">{coach.name}</h2>
          <code className="text-xs text-taupe-400">{coach.id}</code>
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
      </div>

      {/* Public profile */}
      <div className="p-6">
        <p className="mb-5 text-xs font-medium uppercase tracking-widest text-taupe-400">
          Profil public
        </p>
        <form action={coachAction} className="grid gap-4 md:grid-cols-2">
          <input type="hidden" name="op" value="upsert" />
          <input type="hidden" name="id" value={coach.id} />
          {/* Preserve OS fields so they survive a public-profile save */}
          <input type="hidden" name="email" value={coach.email ?? ""} />
          <input
            type="hidden"
            name="osProfileId"
            value={coach.osProfileId ?? ""}
          />
          <Field
            label="Nom complet"
            name="name"
            defaultValue={coach.name}
            required
          />
          <Field
            label="Initiales"
            name="initials"
            defaultValue={coach.initials}
            required
          />
          <Field
            label="Rôle court"
            name="shortRole"
            defaultValue={coach.shortRole}
            required
          />
          <Field
            label="Rôle complet"
            name="role"
            defaultValue={coach.role}
            required
          />
          <div className="md:col-span-2">
            <Field
              label="Diplôme(s)"
              name="diploma"
              defaultValue={coach.diploma}
              required
            />
          </div>
          <div className="md:col-span-2">
            <Textarea
              label="Bio"
              name="bio"
              defaultValue={coach.bio}
              rows={4}
            />
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
            label="Lien SumUp (optionnel)"
            name="sumupUrl"
            type="url"
            defaultValue={coach.sumupUrl ?? ""}
          />
          <Field
            label="SIRET (mentions légales)"
            name="siret"
            defaultValue={coach.siret ?? ""}
          />
          <Field
            label="Rôle légal (mentions légales)"
            name="legalRole"
            defaultValue={coach.legalRole ?? ""}
          />
          <Field
            label="Email professionnel (mentions légales)"
            name="proEmail"
            type="email"
            defaultValue={coach.proEmail ?? ""}
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
      </div>

      {/* OS access */}
      <OsSection coach={coach} osStatus={osStatus} />
    </article>
  );
}

// ─── OS section ───────────────────────────────────────────────────────────────

function OsSection({
  coach,
  osStatus,
}: {
  coach: Coach;
  osStatus: OsCoachStatus | undefined;
}) {
  if (!coach.osProfileId) {
    return (
      <div className="border-t border-taupe-200/60 bg-sand-50/60 px-6 py-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-taupe-400">
          Accès Cabinet OS
        </p>
        <p className="mb-5 text-sm text-taupe-500">
          Ce coach n&apos;a pas encore de compte OS rattaché.
        </p>

        {/* Option 1 — nouveau compte */}
        <div className="mb-5">
          <p className="mb-2 text-xs font-medium text-ink-900">
            Créer un nouveau compte (envoie une invitation par email)
          </p>
          <form
            action={createOsAccountAction}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="coachId" value={coach.id} />
            <div className="min-w-[220px] flex-1">
              <Field
                label="Email"
                name="email"
                type="email"
                required
                placeholder="coach@exemple.com"
                defaultValue={coach.proEmail ?? ""}
              />
            </div>
            <SubmitButton>Créer l&apos;accès OS →</SubmitButton>
          </form>
        </div>

        {/* Séparateur */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-taupe-200/60" />
          <span className="text-xs text-taupe-400">ou</span>
          <div className="h-px flex-1 bg-taupe-200/60" />
        </div>

        {/* Option 2 — rattacher un compte existant */}
        <div>
          <p className="mb-2 text-xs font-medium text-ink-900">
            Rattacher un compte OS existant (sans envoyer d&apos;invitation)
          </p>
          <form
            action={linkExistingOsAccountAction}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="coachId" value={coach.id} />
            <div className="min-w-[220px] flex-1">
              <Field
                label="Email du compte OS existant"
                name="email"
                type="email"
                required
                placeholder="coach@exemple.com"
                defaultValue={coach.email ?? ""}
              />
            </div>
            <SubmitButton>Rattacher →</SubmitButton>
          </form>
        </div>
      </div>
    );
  }

  const status = osStatus?.status ?? "inactive";
  const email = osStatus?.email ?? coach.email ?? "";

  const badge = {
    pending: {
      cls: "bg-amber-50 text-amber-700",
      label: "Invitation en attente",
    },
    active: { cls: "bg-emerald-50 text-emerald-800", label: "Activé" },
    inactive: { cls: "bg-red-50 text-red-700", label: "Désactivé" },
  }[status];

  return (
    <div className="border-t border-taupe-200/60 bg-sand-50/60 px-6 py-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-taupe-400">
          Accès Cabinet OS
        </p>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <p className="mb-4 text-sm text-taupe-600">{email}</p>

      <div className="flex flex-wrap gap-3">
        {status === "pending" && (
          <form action={resendInviteAction}>
            <input type="hidden" name="email" value={email} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-4 py-2 text-xs font-medium text-ink-900 transition-all hover:border-taupe-400 hover:bg-sand-100"
            >
              Renvoyer l&apos;invitation
            </button>
          </form>
        )}

        <form action={toggleOsAccessAction}>
          <input type="hidden" name="osProfileId" value={coach.osProfileId} />
          <input
            type="hidden"
            name="active"
            value={status === "inactive" ? "true" : "false"}
          />
          <button
            type="submit"
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-all ${
              status === "inactive"
                ? "border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                : "border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            {status === "inactive" ? "Réactiver l'accès" : "Désactiver l'accès"}
          </button>
        </form>
      </div>
    </div>
  );
}
