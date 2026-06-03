import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Button } from "@/app/components/ui/Button";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { HeroDecor } from "@/app/components/motion/HeroDecor";
import { CoachCard } from "@/app/components/ui/CoachCard";
import { TestimonialCard } from "@/app/components/ui/TestimonialCard";
import { PremiumBackground } from "@/app/components/ui/PremiumBackground";
import { FormattedText } from "@/app/components/ui/FormattedText";
import { type Coach } from "@/lib/content/coaches";
import { loadActiveCoaches } from "@/lib/content/coaches.server";
import { type Testimonial } from "@/lib/content/testimonials";
import { loadVisibleTestimonials } from "@/lib/content/testimonials.server";
import { loadTexts } from "@/lib/content/texts.server";
import { textOrDefault, type SiteTexts } from "@/lib/content/texts";
import { loadImages } from "@/lib/content/images.server";
import { getGalleryPhotos, type SiteImages } from "@/lib/content/images";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [coaches, texts, images, visibleAvis] = await Promise.all([
    loadActiveCoaches(),
    loadTexts(),
    loadImages(),
    loadVisibleTestimonials(),
  ]);
  return (
    <>
      <PremiumBackground src={images.background} />
      <Header />
      <main className="flex-1">
        <Hero texts={texts} heroImage={images.hero} />
        <Approche texts={texts} />
        <CoachsPreview coaches={coaches} images={images} texts={texts} />
        <CabinetSection images={images} />
        <Piliers texts={texts} />
        <AvisPreview texts={texts} testimonials={visibleAvis} />
        <CTAFinal texts={texts} />
      </main>
      <Footer />
    </>
  );
}

function Hero({
  texts,
  heroImage,
}: {
  texts: SiteTexts;
  heroImage: string | null;
}) {
  const metas = [texts.heroMeta1, texts.heroMeta2, texts.heroMeta3].filter(
    (m) => m && m.trim().length > 0,
  );
  const showImage = Boolean(heroImage);
  return (
    <Section className="relative overflow-hidden pt-24 sm:pt-32">
      <HeroDecor />
      <Container>
        <div
          className={
            showImage
              ? "grid items-center gap-12 lg:grid-cols-[1.15fr_minmax(0,440px)]"
              : ""
          }
        >
          <div>
            <FadeIn>
              <p className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.25em] text-taupe-500">
                <span className="h-px w-8 bg-taupe-400" />
                {textOrDefault(texts, "heroEyebrow")}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl md:text-7xl">
                {textOrDefault(texts, "heroTitleLead")}
                <br />
                <span className="italic text-taupe-600">
                  {textOrDefault(texts, "heroTitleAccent")}
                </span>
                {texts.heroTitleTrail}
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <FormattedText
                text={textOrDefault(texts, "heroSubtitle")}
                topGap="mt-8"
                className="max-w-xl text-lg leading-relaxed text-taupe-700"
              />
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button href="/reservation" variant="primary">
                  {textOrDefault(texts, "heroCtaPrimary")}
                </Button>
                <Button href="/offres" variant="secondary">
                  {textOrDefault(texts, "heroCtaSecondary")}
                </Button>
              </div>
            </FadeIn>
            {metas.length > 0 && (
              <FadeIn delay={0.45}>
                <ul className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-taupe-500">
                  {metas.map((m) => (
                    <li key={m} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-taupe-400" />
                      {m}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            )}
          </div>
          {showImage && heroImage && (
            <FadeIn delay={0.2}>
              <div className="group relative overflow-hidden rounded-3xl shadow-[0_40px_100px_-30px_rgba(78,70,59,0.45)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt=""
                  className="aspect-[4/5] w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                  loading="eager"
                />
                {/* Voile dégradé en bas pour fondre avec le fond */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to bottom, transparent 60%, rgba(247,242,232,0.55) 100%)",
                  }}
                />
                {/* Bords latéraux fondus */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(to right, rgba(247,242,232,0.18) 0%, transparent 12%, transparent 88%, rgba(247,242,232,0.18) 100%)",
                  }}
                />
                {/* Anneau subtil */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-taupe-300/30" />
              </div>
            </FadeIn>
          )}
        </div>
      </Container>
    </Section>
  );
}

function Approche({ texts }: { texts: SiteTexts }) {
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/40">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            {textOrDefault(texts, "approcheEyebrow")}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-6 max-w-3xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl md:text-5xl">
            {textOrDefault(texts, "approcheTitle")}
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <FormattedText
            text={textOrDefault(texts, "approcheBody")}
            topGap="mt-6"
            className="max-w-2xl text-base leading-relaxed text-taupe-700"
          />
        </Reveal>
      </Container>
    </Section>
  );
}

function CoachsPreview({
  coaches,
  images,
  texts,
}: {
  coaches: Coach[];
  images: SiteImages;
  texts: SiteTexts;
}) {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                {textOrDefault(texts, "coachsPreviewEyebrow")}
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                {textOrDefault(texts, "coachsPreviewTitle")}
              </h2>
            </div>
            <Button href="/coachs" variant="ghost">
              {textOrDefault(texts, "coachsPreviewCta")}
            </Button>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {coaches.map((coach, i) => (
            <Reveal key={coach.id} delay={i * 0.1}>
              <CoachCard coach={coach} photoUrl={images.coaches[coach.id]} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Piliers({ texts }: { texts: SiteTexts }) {
  const items = [
    {
      title: textOrDefault(texts, "pilier1Title"),
      text: textOrDefault(texts, "pilier1Body"),
    },
    {
      title: textOrDefault(texts, "pilier2Title"),
      text: textOrDefault(texts, "pilier2Body"),
    },
    {
      title: textOrDefault(texts, "pilier3Title"),
      text: textOrDefault(texts, "pilier3Body"),
    },
  ];
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/40">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            {textOrDefault(texts, "piliersEyebrow")}
          </p>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            {textOrDefault(texts, "piliersTitle")}
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-4 rounded-3xl border border-taupe-300/30 bg-sand-50 p-8">
                <span className="font-serif text-3xl text-taupe-400">
                  0{i + 1}
                </span>
                <h3 className="font-serif text-xl text-ink-900">{p.title}</h3>
                <FormattedText
                  text={p.text}
                  className="text-base leading-relaxed text-taupe-700"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function AvisPreview({
  texts,
  testimonials,
}: {
  texts: SiteTexts;
  testimonials: Testimonial[];
}) {
  if (testimonials.length === 0) return null;
  const preview = testimonials.slice(0, 2);
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                {textOrDefault(texts, "avisPreviewEyebrow")}
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                {textOrDefault(texts, "avisPreviewTitle")}
              </h2>
            </div>
            <Button href="/avis" variant="ghost">
              {textOrDefault(texts, "avisPreviewCta")}
            </Button>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {preview.map((t, i) => (
            <Reveal key={i} delay={i * 0.1}>
              <TestimonialCard testimonial={t} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CabinetSection({ images }: { images: SiteImages }) {
  const cabinetPhotos = getGalleryPhotos(images, "cabinet-");
  const ambiancePhotos = getGalleryPhotos(images, "ambiance-");

  // Exclude hero and background to avoid showing the same photo twice
  const excludeUrls = new Set(
    [images.hero, images.background].filter((u): u is string => u !== null),
  );
  const allPhotos = [...cabinetPhotos, ...ambiancePhotos]
    .filter((url) => !excludeUrls.has(url))
    .slice(0, 6);

  if (allPhotos.length === 0) return null;

  return (
    <Section className="border-t border-taupe-300/30">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Le cabinet
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Un espace pensé{" "}
            <span className="italic text-taupe-600">pour votre progression.</span>
          </h2>
        </Reveal>
        <EditorialGallery photos={allPhotos} />
      </Container>
    </Section>
  );
}

function EditorialGallery({ photos }: { photos: string[] }) {
  const visible = photos.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="mt-12 flex flex-wrap gap-6">
      {visible.map((url, i) => (
        <Reveal key={url} delay={i * 0.11}>
          <div
            className="img-gallery-editorial"
            style={{ width: 168, height: 236 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" loading="lazy" />
          </div>
        </Reveal>
      ))}
    </div>
  );
}

function CTAFinal({ texts }: { texts: SiteTexts }) {
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/60">
      <Container>
        <Reveal>
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <h2 className="font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                {textOrDefault(texts, "ctaFinalTitle")}
              </h2>
              <FormattedText
                text={textOrDefault(texts, "ctaFinalBody")}
                topGap="mt-4"
                className="text-base leading-relaxed text-taupe-700"
              />
            </div>
            <Button href="/reservation" variant="primary">
              {textOrDefault(texts, "ctaFinalButton")}
            </Button>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
