import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";
import { loadImages } from "@/lib/content/images.server";
import { loadCoaches } from "@/lib/content/coaches.server";
import { AdminShell, FlashMessages } from "../_components/AdminShell";
import { ImageUploadForm } from "../_components/ImageUploadForm";
import {
  clearImage,
  uploadBackground,
  uploadCoachPhoto,
  uploadGalleryPhoto,
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

  const gallerySlots: Array<{ key: string; label: string; hint: string }> = [
    { key: "cabinet-1", label: "Cabinet — photo 1", hint: "Vue d'ensemble du cabinet, accueil, salle." },
    { key: "cabinet-2", label: "Cabinet — photo 2", hint: "Détail d'équipement ou espace de travail." },
    { key: "cabinet-3", label: "Cabinet — photo 3", hint: "Ambiance lumière, rangement, décoration." },
    { key: "ambiance-1", label: "Ambiance — photo 1", hint: "Photo de séance ou exercice en action." },
    { key: "ambiance-2", label: "Ambiance — photo 2", hint: "Posture, mouvement, bilan ou stretching." },
    { key: "ambiance-3", label: "Ambiance — photo 3", hint: "Portrait ou moment de coaching." },
  ];

  return (
    <AdminShell
      title="Médias & Photos"
      intro="Gérez toutes les images du site : logo, hero, arrière-plan premium, galerie cabinet et photos coachs. Format max 5 Mo. Les images sont affichées automatiquement avec des effets premium."
    >
      <FlashMessages saved={params.saved} error={params.error} />

      <div className="space-y-10">

        {/* ── Identité visuelle ─────────────────────────────────── */}
        <SectionTitle title="Identité visuelle" />

        <ImageSlot
          title="Logo du site"
          hint="Affiché dans le header et le footer. PNG ou SVG recommandé. Dimensions conseillées : 220×80 px minimum."
          currentUrl={images.logo}
          fallback="/logo.png"
          uploadAction={uploadLogo}
          slotId="logo"
          extraData={{}}
        />

        {/* ── Images de mise en scène ──────────────────────────── */}
        <SectionTitle title="Images de mise en scène" />

        <ImageSlot
          title="Image hero (côté droit de l'accueil)"
          hint="Affichée à droite du titre principal sur desktop. Format portrait recommandé : 880×1100 px. Ratio 4/5."
          currentUrl={images.hero}
          uploadAction={uploadHero}
          slotId="hero"
          extraData={{}}
        />

        <ImageSlot
          title="Arrière-plan premium"
          hint="Intégrée en fond de page avec opacité réduite, flou doux et dégradé sable. Visible mais discrète. Toute belle photo d'ambiance convient (1920×1080 px minimum)."
          currentUrl={images.background}
          uploadAction={uploadBackground}
          slotId="background"
          badge="Nouveau"
          extraData={{}}
        />

        {/* ── Galerie cabinet & ambiance ───────────────────────── */}
        <SectionTitle title="Galerie — Cabinet & Ambiance" description="Ces photos apparaissent dans une mini galerie sur la page d'accueil (si au moins 1 photo est activée). Ratio 4/5 recommandé, 800×1000 px minimum." />

        {gallerySlots.map((slot) => (
          <ImageSlot
            key={slot.key}
            title={slot.label}
            hint={slot.hint}
            currentUrl={images.gallery[slot.key] ?? null}
            uploadAction={uploadGalleryPhoto}
            extraData={{ gallerySlot: slot.key }}
            slotId={`gallery:${slot.key}`}
            badge="Galerie"
          />
        ))}

        {/* ── Photos coachs ────────────────────────────────────── */}
        <SectionTitle title="Photos des coachs" description="Remplace l'avatar initiales sur les pages /coachs et l'accueil. Format carré recommandé : 600×600 px. La photo est affichée en cercle." />

        {coaches.map((coach) => (
          <ImageSlot
            key={coach.id}
            title={`Photo de ${coach.name}`}
            hint={`Affiché en cercle sur les cartes coach et la page /coachs. Format carré 600×600 px recommandé.`}
            currentUrl={images.coaches[coach.id] ?? null}
            uploadAction={uploadCoachPhoto}
            extraData={{ coachId: coach.id }}
            slotId={`coach:${coach.id}`}
          />
        ))}
      </div>
    </AdminShell>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-taupe-300/30 pb-3 pt-4">
      <h2 className="font-serif text-2xl text-ink-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-taupe-500">{description}</p>
      )}
    </div>
  );
}

function ImageSlot({
  title,
  hint,
  currentUrl,
  fallback,
  uploadAction,
  slotId,
  extraData,
  badge,
}: {
  title: string;
  hint: string;
  currentUrl: string | null;
  fallback?: string;
  uploadAction: (formData: FormData) => Promise<void>;
  slotId: string;
  extraData?: Record<string, string>;
  badge?: string;
}) {
  const displayed = currentUrl ?? fallback ?? null;
  return (
    <article className="rounded-2xl border border-taupe-300/40 bg-white p-6">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="font-serif text-xl text-ink-900">{title}</h3>
          {badge && (
            <span className="rounded-full bg-sand-100 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-taupe-600">
              {badge}
            </span>
          )}
        </div>
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
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-taupe-300/40 bg-sand-100/40">
          {displayed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayed}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-center text-xs text-taupe-500">
              Aucune
              <br />
              image
            </span>
          )}
        </div>
        <ImageUploadForm action={uploadAction} extraData={extraData} />
      </div>
    </article>
  );
}
