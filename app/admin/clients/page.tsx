import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadClients } from "@/lib/content/clients.server";
import {
  clientStatuses,
  clientStatusLabel,
  type Client,
} from "@/lib/content/clients";
import { readContentKey } from "@/lib/supabase/content";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { Field, SubmitButton } from "../_components/Fields";
import { removeClient, saveSheetUrl, setClientStatus } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Clients",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

const statusBadgeCls: Record<string, string> = {
  nouveau: "bg-sand-200/80 text-ink-900",
  contacté: "bg-taupe-300/40 text-taupe-700",
  payé: "bg-emerald-100 text-emerald-900",
  annulé: "bg-red-100 text-red-800",
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [clients, settingsRaw] = await Promise.all([
    loadClients(),
    readContentKey("clients_settings"),
  ]);
  const params = await searchParams;
  const sheetUrl =
    settingsRaw &&
    typeof settingsRaw === "object" &&
    "googleSheetUrl" in settingsRaw &&
    typeof (settingsRaw as { googleSheetUrl: unknown }).googleSheetUrl ===
      "string"
      ? (settingsRaw as { googleSheetUrl: string }).googleSheetUrl
      : null;

  return (
    <AdminShell
      title="Clients"
      intro="Demandes reçues via le formulaire de contact et les futures réservations. Met à jour le statut au fil de tes échanges."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <article className="mb-8 rounded-2xl border border-taupe-300/40 bg-white p-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-base text-ink-900">
              Lien Google Sheet
            </h2>
            <p className="mt-1 text-xs text-taupe-500">
              Optionnel — pour suivre les clients en parallèle dans un Sheet.
            </p>
          </div>
          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-all hover:bg-sand-100"
            >
              Ouvrir Google Sheet ↗
            </a>
          )}
        </header>
        <form action={saveSheetUrl} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Field
              label="URL Google Sheet"
              name="url"
              type="url"
              defaultValue={sheetUrl ?? ""}
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
          </div>
          <SubmitButton>Enregistrer</SubmitButton>
        </form>
      </article>

      {clients.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-6 text-sm text-taupe-600">
          Aucun client pour le moment. Les soumissions du formulaire de contact
          apparaîtront ici automatiquement.
        </p>
      ) : (
        <div className="space-y-4">
          {clients.map((c) => (
            <ClientRow key={c.id} client={c} />
          ))}
        </div>
      )}
    </AdminShell>
  );
}

function ClientRow({ client }: { client: Client }) {
  const date = new Date(client.createdAt);
  const formatted = date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg text-ink-900">{client.name}</h2>
          <p className="text-xs text-taupe-500">
            {formatted} · {client.source}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadgeCls[client.status] ?? "bg-sand-100 text-taupe-700"}`}
        >
          {clientStatusLabel[client.status]}
        </span>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Cell label="Email">
          <a
            href={`mailto:${client.email}`}
            className="text-ink-900 transition-colors hover:text-taupe-700"
          >
            {client.email}
          </a>
        </Cell>
        {client.phone && <Cell label="Téléphone">{client.phone}</Cell>}
        {client.subject && <Cell label="Sujet">{client.subject}</Cell>}
        {client.offerId && <Cell label="Offre">{client.offerId}</Cell>}
        {client.coachId && <Cell label="Coach">{client.coachId}</Cell>}
      </dl>

      {client.message && (
        <p className="mt-4 whitespace-pre-line rounded-xl bg-sand-100/50 p-4 text-sm text-taupe-700">
          {client.message}
        </p>
      )}

      <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-taupe-300/30 pt-4">
        <form action={setClientStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={client.id} />
          <label className="text-xs uppercase tracking-wider text-taupe-500">
            Statut
          </label>
          <select
            name="status"
            defaultValue={client.status}
            className="rounded-full border border-taupe-300/50 bg-white px-3 py-1.5 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
          >
            {clientStatuses.map((s) => (
              <option key={s} value={s}>
                {clientStatusLabel[s]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-full bg-taupe-700 px-4 py-1.5 text-xs font-medium text-sand-50 transition-colors hover:bg-taupe-800"
          >
            Mettre à jour
          </button>
        </form>
        <form action={removeClient}>
          <input type="hidden" name="id" value={client.id} />
          <button
            type="submit"
            className="text-xs text-red-700 transition-colors hover:text-red-900"
          >
            Supprimer
          </button>
        </form>
      </footer>
    </article>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-taupe-500">
        {label}
      </dt>
      <dd className="mt-1 text-ink-900">{children}</dd>
    </div>
  );
}
