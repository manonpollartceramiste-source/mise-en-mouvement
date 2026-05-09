import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadImages } from "@/lib/content/images.server";
import { loadCoaches } from "@/lib/content/coaches.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { FileField, SubmitButton } from "../_components/Fields";
import {
  clearImage,
  uploadCoachPhoto,
  uploadHero,
  uploadLogo,
} from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Images",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ saved?: string; error?: string }>;

export default async function AdminImagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/admin/login?error=supabase-missing");
  }
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [images, coaches] = await Promise.all([
    loadImages(),
    loadCoaches(),
  ]);
  const params = await searchParams;

  return (
    <AdminShell
      title="Images"
      intro="Logo, photo de hero et photos des coachs. Format max 5 Mo. Si aucun fichier n’est uploadé, le site utilise l’image bundlée par défaut."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-8">
        <ImageSlot
          title="Logo du site"
          hint="Affiché dans le header et le footer. PNG ou SVG recommandé."
          currentUrl={images.logo}
          fallback="/logo.png"
          uploadAction={uploadLogo}
          slotId="logo"
        />

        <ImageSlot
          title="Image du hero (optionnelle)"
          hint="Pas encore intégrée à l’accueil — sera utilisée plus tard."
          currentUrl={images.hero}
          uploadAction={uploadHero}
          slotId="hero"
        />

        {coaches.map((coach) => (
          <ImageSlot
            key={coach.id}
            title={`Photo de ${coach.name}`}
            hint={`Remplace l’avatar avec initiales sur les pages /coachs et /.`}
            currentUrl={images.coaches[coach.id] ?? null}
            uploadAction={uploadCoachPhoto.bind(null)}
            extraFields={
              <input type="hidden" name="coachId" value={coach.id} />
            }
            slotId={`coach:${coach.id}`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

function ImageSlot({
  title,
  hint,
  currentUrl,
  fallback,
  uploadAction,
  slotId,
  extraFields,
}: {
  title: string;
  hint: string;
  currentUrl: string | null;
  fallback?: string;
  uploadAction: (formData: FormData) => Promise<void>;
  slotId: string;
  extraFields?: React.ReactNode;
}) {
  const displayed = currentUrl ?? fallback ?? null;
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-xl text-ink-900">{title}</h2>
        {currentUrl && (
          <form action={clearImage}>
            <input type="hidden" name="slot" value={slotId} />
            <button
              type="submit"
              className="text-xs text-red-700 transition-colors hover:text-red-900"
            >
              Retirer
            </button>
          </form>
        )}
      </header>
      <p className="text-sm text-taupe-600">{hint}</p>

      <div className="mt-5 grid items-center gap-6 md:grid-cols-[160px_1fr]">
        <div className="flex h-32 w-32 items-center justify-center rounded-2xl border border-taupe-300/40 bg-sand-100/40">
          {displayed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayed}
              alt=""
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-xs text-taupe-500">Aucune image</span>
          )}
        </div>
        <form action={uploadAction} className="space-y-4">
          {extraFields}
          <FileField
            label="Remplacer par"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            hint="PNG, JPG, WEBP ou SVG · max 5 Mo"
          />
          <SubmitButton>Uploader →</SubmitButton>
        </form>
      </div>
    </article>
  );
}
