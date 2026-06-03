import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { OfferCard } from "@/app/components/ui/OfferCard";
import { loadOffers } from "@/lib/content/offers.server";

export const metadata: Metadata = {
  title: "Offres & tarifs",
  description:
    "Séances, cartes 5 ou 10 séances, programmes sur mesure. Paiement en ligne sécurisé.",
};

const sections = [
  {
    id: "seances",
    eyebrow: "À l’unité",
    title: "Séances",
    description: "Pour découvrir, ou pratiquer sans engagement.",
    category: "ponctuelle" as const,
    columns: "md:grid-cols-2 lg:grid-cols-4",
  },
  {
    id: "cartes",
    eyebrow: "Le bon rythme",
    title: "Cartes",
    description:
      "Le format qui s’installe dans la durée.",
    category: "carte" as const,
    columns: "md:grid-cols-2",
  },
  {
    id: "programmes",
    eyebrow: "Sur mesure",
    title: "Programmes sur devis",
    description:
      "Un parcours structuré, conçu autour de votre objectif et de votre rythme de vie.",
    category: "programme" as const,
    columns: "md:grid-cols-2",
  },
];

export default async function OffresPage() {
  const allOffers = await loadOffers();
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                Offres & tarifs
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Une formule
                <br />
                <span className="italic text-taupe-600">pour chaque rythme.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                Choisissez le format qui vous correspond aujourd’hui — vous
                pourrez toujours évoluer ensuite. Paiement en ligne sécurisé.
              </p>
            </FadeIn>
          </Container>
        </Section>

        {sections.map((s) => {
          const offers = allOffers.filter((o) => o.category === s.category);
          return (
            <Section
              key={s.id}
              id={s.id}
              className="border-t border-taupe-300/30 first-of-type:border-t-0"
            >
              <Container>
                <Reveal>
                  <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                    {s.eyebrow}
                  </p>
                  <h2 className="mt-4 font-serif text-3xl leading-tight text-ink-900 sm:text-4xl">
                    {s.title}
                  </h2>
                  <p className="mt-3 max-w-xl text-base leading-relaxed text-taupe-700">
                    {s.description}
                  </p>
                </Reveal>
                <div className={`mt-12 grid gap-6 ${s.columns}`}>
                  {offers.map((offer, i) => (
                    <Reveal key={offer.id} delay={i * 0.08}>
                      <OfferCard offer={offer} />
                    </Reveal>
                  ))}
                </div>
              </Container>
            </Section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
