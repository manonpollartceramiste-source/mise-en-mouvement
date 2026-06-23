import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMediaItems } from "@/lib/billing/server";
import { uploadMediaAction, deleteMediaAction, toggleMediaAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Médiathèque · Admin",
  robots: { index: false, follow: false },
};

const CATEGORIES = [
  { value: "hero", label: "Hero" },
  { value: "cabinet", label: "Cabinet" },
  { value: "coach", label: "Coach" },
  { value: "seance", label: "Séance" },
  { value: "temoignage", label: "Témoignage" },
  { value: "exercices", label: "Exercices" },
  { value: "ambiance", label: "Ambiance" },
] as const;

type SearchParams = Promise<{ uploaded?: string; deleted?: string; saved?: string; error?: string }>;

export default async function MediasPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  if (!adminEmails.includes(user.email ?? "")) redirect("/admin/login");

  const { uploaded, deleted, saved, error } = await searchParams;
  const medias = await getMediaItems(false);

  return (
    <main className="min-h-screen bg-sand-50">
      <header className="border-b border-taupe-300/30 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <Link href="/admin" className="text-xs text-taupe-500 hover:text-ink-900">
              ← Admin
            </Link>
            <h1 className="mt-1 font-serif text-2xl text-ink-900">Médiathèque</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Notifications */}
        {uploaded && (
          <div className="mb-6 rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Média uploadé avec succès.
          </div>
        )}
        {deleted && (
          <div className="mb-6 rounded-xl bg-sand-100 px-5 py-3 text-sm font-medium text-taupe-700">
            Média supprimé.
          </div>
        )}
        {saved && (
          <div className="mb-6 rounded-xl bg-green-50 px-5 py-3 text-sm font-medium text-green-700">
            Modifications enregistrées.
          </div>
        )}
        {error === "upload" && (
          <div className="mb-6 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Erreur lors de l&apos;upload. Vérifiez que le bucket Supabase &quot;site-media&quot; existe.
          </div>
        )}
        {error === "no-file" && (
          <div className="mb-6 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Aucun fichier sélectionné.
          </div>
        )}
        {error === "type" && (
          <div className="mb-6 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Type de fichier non supporté. Utilisez JPG, PNG, WebP, GIF, MP4, WebM ou MOV.
          </div>
        )}
        {error === "size" && (
          <div className="mb-6 rounded-xl bg-red-50 px-5 py-3 text-sm font-medium text-red-700">
            Fichier trop volumineux (limite : 50 Mo).
          </div>
        )}

        {/* Upload form */}
        <section className="mb-10 rounded-2xl border border-taupe-300/40 bg-white p-7">
          <h2 className="mb-6 font-serif text-xl text-ink-900">Ajouter un média</h2>
          <form action={uploadMediaAction} encType="multipart/form-data" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-taupe-600">
                  Fichier (image ou vidéo) *
                </label>
                <input
                  type="file"
                  name="file"
                  accept="image/*,video/*"
                  required
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 file:mr-4 file:rounded-lg file:border-0 file:bg-ink-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-sand-50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Titre</label>
                <input
                  type="text"
                  name="title"
                  placeholder="Ex : Photo cabinet avant-après"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-taupe-600">Catégorie *</label>
                <select
                  name="category"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-taupe-600">Description</label>
                <input
                  type="text"
                  name="description"
                  placeholder="Description courte (optionnel)"
                  className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700"
              >
                Uploader
              </button>
            </div>
          </form>
        </section>

        {/* Gallery */}
        {medias.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-16 text-center">
            <p className="font-serif text-2xl text-ink-900">Aucun média</p>
            <p className="mt-3 text-sm text-taupe-500">
              Uploadez votre première photo ou vidéo pour enrichir votre site.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {medias.map((media) => (
              <div
                key={media.id}
                className={`group relative rounded-2xl border bg-white p-3 transition-all ${
                  media.is_active
                    ? "border-taupe-300/40"
                    : "border-taupe-200/40 opacity-60"
                }`}
              >
                {/* Preview */}
                <div className="relative mb-3 aspect-square overflow-hidden rounded-xl bg-sand-100">
                  {media.file_type === "video" ? (
                    <video
                      src={media.file_url}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    <Image
                      src={media.file_url}
                      alt={media.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                  )}
                  {/* Category badge */}
                  <span className="absolute left-2 top-2 rounded-full bg-ink-900/80 px-2 py-0.5 text-[10px] font-medium text-sand-50 backdrop-blur-sm">
                    {CATEGORIES.find((c) => c.value === media.category)?.label ?? media.category}
                  </span>
                  {/* Type badge */}
                  {media.file_type === "video" && (
                    <span className="absolute right-2 top-2 rounded-full bg-taupe-700/80 px-2 py-0.5 text-[10px] font-medium text-sand-50 backdrop-blur-sm">
                      Vidéo
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="px-1">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {media.title || "Sans titre"}
                  </p>
                  {media.description && (
                    <p className="mt-0.5 truncate text-xs text-taupe-500">
                      {media.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center justify-between gap-2 px-1">
                  <form action={toggleMediaAction}>
                    <input type="hidden" name="id" value={media.id} />
                    <input type="hidden" name="is_active" value={String(media.is_active)} />
                    <button
                      type="submit"
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        media.is_active
                          ? "bg-green-50 text-green-700 hover:bg-green-100"
                          : "bg-sand-100 text-taupe-600 hover:bg-sand-200"
                      }`}
                    >
                      {media.is_active ? "Actif" : "Inactif"}
                    </button>
                  </form>
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="id" value={media.id} />
                    <input type="hidden" name="file_url" value={media.file_url} />
                    <button
                      type="submit"
                      onClick={(e) => {
                        if (!confirm("Supprimer ce média ?")) e.preventDefault();
                      }}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Supprimer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
