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
import { getDiscoverySessionSettings } from "@/lib/billing/server";
import { getMediaItems } from "@/lib/billing/server";
import type { DiscoverySessionSettings, MediaItem } from "@/lib/billing/types";
export const dynamic = "force-dynamic";

export default async function Home() {
  const [coaches, texts, images, visibleAvis, discovery, mediaItems] = await Promise.all([
    loadActiveCoaches(),
    loadTexts(),
    loadImages(),
    loadVisibleTestimonials(),
    getDiscoverySessionSettings(),
    getMediaItems(true),
  ]);

  // Filtrage par site_location (nouveau système) avec fallback sur category (legacy)
  const byLoc = (loc: string) => mediaItems.filter((m) => m.site_location === loc);
  const heroMedias    = byLoc("hero").length    > 0 ? byLoc("hero")    : mediaItems.filter((m) => m.category === "hero");
  const cabinetMedias = byLoc("cabinet").length > 0 ? byLoc("cabinet") : mediaItems.filter((m) => m.category === "cabinet" || m.category === "ambiance");
  const exercicesMedias  = byLoc("exercices");
  const avantApresMedias = byLoc("avant-apres");

  return (
    <>
      <PremiumBackground src={images.background} />
      <Header />
      <main className="flex-1">
        <Hero texts={texts} heroImage={images.hero} heroMedia={heroMedias[0] ?? null} />
        <Approche texts={texts} />
        <SeanceDecouverte discovery={discovery} />
        <CommentCaSePasseSection />
        <CoachsPreview coaches={coaches} images={images} texts={texts} />
        <CabinetSection images={images} galleryMedias={cabinetMedias} />
        {exercicesMedias.length > 0 && <ExercicesSection medias={exercicesMedias} />}
        {avantApresMedias.length > 0 && <AvantApresSection medias={avantApresMedias} />}
        <Piliers texts={texts} />
        <AvisPreview texts={texts} testimonials={visibleAvis} />
        <FAQSection />
        <CTAFinal texts={texts} discovery={discovery} />
      </main>
      <Footer />
    </>
  );
}

// ── Séance Découverte ──────────────────────────────────────────

function SeanceDecouverte({ discovery }: { discovery: DiscoverySessionSettings }) {
  const steps = discovery.session_steps.length > 0
    ? discovery.session_steps
    : [
        "Échange sur votre quotidien et vos objectifs",
        "Observation et analyse de vos mouvements",
        "Bilan mouvement personnalisé",
        "Recommandations concrètes et plan d'action",
      ];
  const benefits = discovery.benefits.length > 0
    ? discovery.benefits
    : [
        "Vous comprenez pourquoi vous avez mal",
        "Vous identifiez vos priorités de travail",
        "Vous repartez avec un plan concret",
        "Vous recevez votre bilan PDF personnalisé",
      ];

  return (
    <Section className="relative overflow-hidden bg-ink-900">
      {/* Texture subtile */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #beb09c 0%, transparent 60%), radial-gradient(circle at 80% 20%, #a89a89 0%, transparent 55%)",
        }}
      />
      <Container className="relative">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
          {/* Texte */}
          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
                Premier pas
              </p>
              <h2 className="mt-5 font-serif text-4xl leading-tight text-sand-50 sm:text-5xl">
                {discovery.title}
              </h2>
              <p className="mt-3 text-lg text-taupe-300 italic">
                {discovery.subtitle}
              </p>
            </Reveal>

            {/* Prix + durée */}
            <Reveal delay={0.1}>
              <div className="mt-8 flex items-center gap-6">
                <div className="text-center">
                  <p className="font-serif text-5xl font-light text-sand-50">
                    {discovery.price}€
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-taupe-400">
                    la séance
                  </p>
                </div>
                <div className="h-12 w-px bg-taupe-700" />
                <div className="text-center">
                  <p className="font-serif text-5xl font-light text-sand-50">
                    {discovery.duration_min}&nbsp;<span className="text-3xl">min</span>
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-widest text-taupe-400">
                    d&apos;analyse
                  </p>
                </div>
              </div>
            </Reveal>

            {discovery.description && (
              <Reveal delay={0.15}>
                <p className="mt-8 text-base leading-relaxed text-taupe-300">
                  {discovery.description}
                </p>
              </Reveal>
            )}

            <Reveal delay={0.2}>
              <div className="mt-10">
                <Button href="/reservation" variant="primary">
                  {discovery.cta_label}
                </Button>
              </div>
            </Reveal>
          </div>

          {/* Étapes + bénéfices */}
          <div className="space-y-6">
            <Reveal delay={0.1}>
              <div className="rounded-2xl border border-taupe-700 bg-taupe-800/50 p-6">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-taupe-400">
                  Déroulé de la séance
                </p>
                <ol className="space-y-3">
                  {steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-taupe-600 font-serif text-xs text-taupe-400">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-sand-200">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="rounded-2xl border border-taupe-700 bg-taupe-800/50 p-6">
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-taupe-400">
                  Ce que vous repartez avec
                </p>
                <ul className="space-y-2.5">
                  {benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-taupe-400" />
                      <span className="text-sm leading-relaxed text-sand-200">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}

// ── Comment ça se passe ────────────────────────────────────────

function CommentCaSePasseSection() {
  const steps = [
    {
      num: "01",
      title: "L'échange",
      body: "On commence par un moment d'écoute : votre quotidien, vos douleurs, vos objectifs. Pas de jugement, juste de la curiosité.",
    },
    {
      num: "02",
      title: "L'observation",
      body: "Nous analysons comment votre corps bouge — posture, mobilité, équilibre, compensation. Une lecture précise de votre profil de mouvement.",
    },
    {
      num: "03",
      title: "Le bilan",
      body: "Vous comprenez vos points forts et vos axes prioritaires. On met des mots clairs sur ce qui se passe dans votre corps.",
    },
    {
      num: "04",
      title: "La mise en mouvement",
      body: "Quelques exercices adaptés pour que vous ressentez immédiatement la différence. Votre corps comprend en bougeant.",
    },
    {
      num: "05",
      title: "Les recommandations",
      body: "Vous repartez avec un plan concret, priorisé, et un bilan PDF récapitulatif. Un vrai point de départ.",
    },
  ];

  return (
    <Section className="border-t border-taupe-300/30">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            La méthode
          </p>
          <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Comment se déroule{" "}
            <span className="italic text-taupe-600">votre séance ?</span>
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((step, i) => (
            <Reveal key={step.num} delay={i * 0.08}>
              <div className="flex h-full flex-col rounded-2xl border border-taupe-300/30 bg-white p-6">
                <span className="font-serif text-3xl text-taupe-300">{step.num}</span>
                <h3 className="mt-3 font-serif text-lg text-ink-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-taupe-600">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ── FAQ ────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: "Est-ce adapté si je ne suis pas sportif ?",
    a: "Absolument. La séance découverte est pensée pour tout le monde, quel que soit votre niveau. Notre approche s'adapte à votre corps, pas l'inverse. Vous n'avez pas besoin d'être sportif pour bouger mieux.",
  },
  {
    q: "Est-ce que c'est une consultation médicale ?",
    a: "Non. Nous sommes coachs mouvement, pas médecins ni kinésithérapeutes. Notre rôle est d'analyser vos mouvements, d'identifier des compensations, et de vous proposer des exercices adaptés. En cas de pathologie, nous travaillons en complémentarité avec votre équipe médicale.",
  },
  {
    q: "Combien de temps dure une séance discovery ?",
    a: "La séance découverte dure environ 1 heure. C'est suffisant pour faire un vrai bilan de mouvement complet et vous donner des pistes concrètes. Pas trop long pour que vous puissiez repartir avec de l'énergie.",
  },
  {
    q: "Que se passe-t-il pendant la séance découverte ?",
    a: "On échange sur votre quotidien et vos objectifs, on observe comment vous bougez naturellement, on fait un bilan complet, on teste quelques exercices, et on trace votre plan de progression. Vous repartez avec votre bilan PDF personnalisé.",
  },
  {
    q: "Faut-il prévoir une tenue particulière ?",
    a: "Oui : venez avec des vêtements confortables dans lesquels vous pouvez bouger librement — legging, short, t-shirt. Des chaussettes suffisent, pas besoin de chaussures de sport spécifiques.",
  },
  {
    q: "Et après la séance découverte ?",
    a: "Rien d'obligatoire. Vous repartez avec votre bilan et vos recommandations. Si vous souhaitez aller plus loin, nous vous proposons des formules de suivi adaptées à vos objectifs et votre rythme de vie.",
  },
];

function FAQSection() {
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/40">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Vos questions
          </p>
          <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Questions fréquentes
          </h2>
        </Reveal>

        <div className="mt-12 max-w-3xl space-y-4">
          {FAQ_ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.06}>
              <details className="group rounded-2xl border border-taupe-300/40 bg-white">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-sm font-medium text-ink-900 marker:content-none hover:text-taupe-700">
                  {item.q}
                  <span className="shrink-0 text-taupe-400 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <div className="border-t border-taupe-300/30 px-6 pb-5 pt-4">
                  <p className="text-sm leading-relaxed text-taupe-600">{item.a}</p>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ── Hero ───────────────────────────────────────────────────────

function Hero({
  texts,
  heroImage,
  heroMedia,
}: {
  texts: SiteTexts;
  heroImage: string | null;
  heroMedia: MediaItem | null;
}) {
  const metas = [texts.heroMeta1, texts.heroMeta2, texts.heroMeta3].filter(
    (m) => m && m.trim().length > 0,
  );
  const effectiveHeroImage = heroMedia?.file_url ?? heroImage;
  const showImage = Boolean(effectiveHeroImage);
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
          {showImage && effectiveHeroImage && (
            <FadeIn delay={0.2}>
              <div className="group relative overflow-hidden rounded-3xl shadow-[0_40px_100px_-30px_rgba(78,70,59,0.45)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={effectiveHeroImage}
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

function CabinetSection({
  images,
  galleryMedias,
}: {
  images: SiteImages;
  galleryMedias: MediaItem[];
}) {
  const cabinetPhotos = getGalleryPhotos(images, "cabinet-");
  const ambiancePhotos = getGalleryPhotos(images, "ambiance-");

  const excludeUrls = new Set(
    [images.hero, images.background].filter((u): u is string => u !== null),
  );
  const legacyPhotos = [...cabinetPhotos, ...ambiancePhotos]
    .filter((url) => !excludeUrls.has(url));

  // Prefer mediathèque medias, fallback to legacy photos
  const mediaUrls = galleryMedias.map((m) => m.file_url);
  const allPhotos = (mediaUrls.length > 0 ? mediaUrls : legacyPhotos).slice(0, 6);

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

function ExercicesSection({ medias }: { medias: MediaItem[] }) {
  return (
    <Section className="border-t border-taupe-300/30">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            En mouvement
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Des exercices <span className="italic text-taupe-600">adaptés à votre corps.</span>
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {medias.slice(0, 6).map((m, i) => (
            <Reveal key={m.id} delay={i * 0.08}>
              <div className="overflow-hidden rounded-2xl bg-sand-100">
                {m.file_type === "video" ? (
                  <video
                    src={m.file_url}
                    className="aspect-video w-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.file_url}
                    alt={m.alt_text || m.title}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                )}
                {m.caption && (
                  <p className="px-4 py-2 text-xs text-taupe-500">{m.caption}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function AvantApresSection({ medias }: { medias: MediaItem[] }) {
  if (medias.length < 2) return null;
  const pairs = [];
  for (let i = 0; i + 1 < medias.length; i += 2) {
    pairs.push([medias[i], medias[i + 1]]);
  }
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/40">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Transformation
          </p>
          <h2 className="mt-4 max-w-xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Avant / <span className="italic text-taupe-600">Après</span>
          </h2>
        </Reveal>
        <div className="mt-10 space-y-8">
          {pairs.map(([before, after], i) => (
            <Reveal key={i} delay={i * 0.1}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={before.file_url} alt={before.alt_text || "Avant"} className="w-full object-cover" loading="lazy" />
                  <p className="mt-2 text-center text-xs uppercase tracking-wider text-taupe-500">Avant</p>
                </div>
                <div className="overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={after.file_url} alt={after.alt_text || "Après"} className="w-full object-cover" loading="lazy" />
                  <p className="mt-2 text-center text-xs uppercase tracking-wider text-taupe-500">Après</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function CTAFinal({
  texts,
  discovery,
}: {
  texts: SiteTexts;
  discovery: DiscoverySessionSettings;
}) {
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
              <p className="mt-4 text-sm font-medium text-taupe-600">
                Séance découverte — {discovery.price} €
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button href="/reservation" variant="primary">
                {discovery.cta_label}
              </Button>
              <Button href="/offres" variant="secondary">
                {textOrDefault(texts, "ctaFinalButton")}
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
