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
import { type Coach } from "@/lib/content/coaches";
import { loadActiveCoaches } from "@/lib/content/coaches.server";
import { testimonials } from "@/lib/content/testimonials";
import { loadTexts } from "@/lib/content/texts.server";
import type { SiteTexts } from "@/lib/content/texts";
import { loadImages } from "@/lib/content/images.server";
import type { SiteImages } from "@/lib/content/images";
import { loadActivePopup } from "@/lib/content/popups.server";
import { PopupBanner } from "@/app/components/popup/PopupBanner";

const piliers = [
  {
    title: "Reprise sans douleur",
    text: "Une approche progressive, sans impact, pour reconstruire la mobilité et la force en profondeur.",
  },
  {
    title: "Suivi personnalisé",
    text: "Un programme conçu pour vous, ajusté à votre niveau, votre histoire et vos objectifs.",
  },
  {
    title: "Cadre premium et calme",
    text: "Un espace haut de gamme, jamais intimidant, où chacun trouve sa place dès la première séance.",
  },
];

export default async function Home() {
  const [coaches, texts, images, popup] = await Promise.all([
    loadActiveCoaches(),
    loadTexts(),
    loadImages(),
    loadActivePopup("home"),
  ]);
  return (
    <>
      <Header />
      <main className="flex-1">
        <Hero texts={texts} heroImage={images.hero} />
        <Approche texts={texts} />
        <CoachsPreview coaches={coaches} images={images} />
        <Piliers />
        <AvisPreview />
        <CTAFinal texts={texts} />
      </main>
      <Footer />
      {popup && <PopupBanner popup={popup} />}
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
    (m) => m.trim().length > 0,
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
                {texts.heroEyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl md:text-7xl">
                {texts.heroTitleLead}
                <br />
                <span className="italic text-taupe-600">
                  {texts.heroTitleAccent}
                </span>
                {texts.heroTitleTrail}
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                {texts.heroSubtitle}
              </p>
            </FadeIn>
            <FadeIn delay={0.3}>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button href="/reservation" variant="primary">
                  Réserver une séance
                </Button>
                <Button href="/offres" variant="secondary">
                  Découvrir les offres
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
              <div className="overflow-hidden rounded-3xl border border-taupe-300/40 bg-sand-100/40 shadow-[0_30px_80px_-30px_rgba(78,70,59,0.35)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={heroImage}
                  alt=""
                  className="aspect-[4/5] w-full object-cover"
                />
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
            {texts.approcheEyebrow}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-6 max-w-3xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl md:text-5xl">
            {texts.approcheTitle}
          </h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-taupe-700">
            {texts.approcheBody}
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}

function CoachsPreview({
  coaches,
  images,
}: {
  coaches: Coach[];
  images: SiteImages;
}) {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                Vos coachs
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                Deux expertises complémentaires.
              </h2>
            </div>
            <Button href="/coachs" variant="ghost">
              Voir leurs parcours →
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

function Piliers() {
  return (
    <Section className="border-t border-taupe-300/30 bg-sand-100/40">
      <Container>
        <Reveal>
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Ce qui nous distingue
          </p>
          <h2 className="mt-4 max-w-2xl font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
            Trois principes, tenus à chaque séance.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {piliers.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.1}>
              <div className="flex h-full flex-col gap-4 rounded-3xl border border-taupe-300/30 bg-sand-50 p-8">
                <span className="font-serif text-3xl text-taupe-400">
                  0{i + 1}
                </span>
                <h3 className="font-serif text-xl text-ink-900">{p.title}</h3>
                <p className="text-base leading-relaxed text-taupe-700">
                  {p.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function AvisPreview() {
  return (
    <Section>
      <Container>
        <Reveal>
          <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                Ils nous ont fait confiance
              </p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                Quelques retours.
              </h2>
            </div>
            <Button href="/avis" variant="ghost">
              Tous les avis →
            </Button>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <Reveal key={t.author} delay={i * 0.1}>
              <TestimonialCard testimonial={t} />
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
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
                {texts.ctaFinalTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-taupe-700">
                {texts.ctaFinalBody}
              </p>
            </div>
            <Button href="/reservation" variant="primary">
              Réserver une séance
            </Button>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}
