import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getAllOsClients,
  getAllOsCoaches,
} from "@/lib/supabase/admin-actions";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import {
  Checkbox,
  Field,
  SelectField,
  SubmitButton,
} from "../_components/Fields";
import type { Profile } from "@/lib/os/types";
import { createClientAction, updateClientAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · OS Clients",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminOsClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) redirect("/admin/login?error=supabase-missing");
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [clients, coaches] = await Promise.all([
    getAllOsClients(),
    getAllOsCoaches(),
  ]);
  const params = await searchParams;

  const coachOptions = [
    { value: "", label: "— Sans coach —" },
    ...coaches.map((c) => ({ value: c.id, label: c.display_name })),
  ];

  return (
    <AdminShell
      title="Clients — Cabinet OS"
      intro="Invitez de nouveaux clients par email et rattachez-les à un coach."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      {clients.length > 0 && (
        <div className="mb-10 space-y-4">
          <h2 className="font-serif text-xl text-ink-900">
            Clients ({clients.length})
          </h2>
          <div className="space-y-4">
            {clients.map((client) => (
              <ClientEditor
                key={client.id}
                client={client}
                coachOptions={coachOptions}
                coaches={coaches}
              />
            ))}
          </div>
        </div>
      )}

      <article className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6">
        <h2 className="font-serif text-xl text-ink-900">
          Inviter un nouveau client
        </h2>
        <p className="mt-1 text-sm text-taupe-600">
          Un email d&apos;invitation sera envoyé automatiquement.
        </p>
        <form
          action={createClientAction}
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <Field
            label="Email"
            name="email"
            type="email"
            required
            placeholder="client@exemple.com"
          />
          <Field
            label="Nom complet"
            name="display_name"
            required
            placeholder="Jean Martin"
          />
          <Field
            label="Téléphone (optionnel)"
            name="phone"
            placeholder="+33 6 00 00 00 00"
          />
          <SelectField
            label="Coach référent"
            name="coach_id"
            options={coachOptions}
          />
          <div className="flex justify-end md:col-span-2">
            <SubmitButton>Inviter le client →</SubmitButton>
          </div>
        </form>
      </article>
    </AdminShell>
  );
}

function ClientEditor({
  client,
  coachOptions,
  coaches,
}: {
  client: Profile;
  coachOptions: { value: string; label: string }[];
  coaches: Profile[];
}) {
  const coachName = coaches.find((c) => c.id === client.coach_id)?.display_name;

  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-xl text-ink-900">
            {client.display_name}
          </h3>
          <p className="text-xs text-taupe-500">
            {client.email}
            {coachName && (
              <span className="ml-3 text-taupe-400">→ {coachName}</span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            client.active
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {client.active ? "Actif" : "Inactif"}
        </span>
      </div>

      <form
        action={updateClientAction}
        className="grid gap-4 md:grid-cols-2"
      >
        <input type="hidden" name="id" value={client.id} />
        <Field
          label="Nom complet"
          name="display_name"
          defaultValue={client.display_name}
          required
        />
        <Field
          label="Téléphone"
          name="phone"
          defaultValue={client.phone ?? ""}
        />
        <SelectField
          label="Coach référent"
          name="coach_id"
          defaultValue={client.coach_id ?? ""}
          options={coachOptions}
        />
        <div className="flex items-end">
          <Checkbox
            label="Compte actif"
            name="active"
            defaultChecked={client.active}
          />
        </div>
        <div className="flex justify-end md:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </article>
  );
}
