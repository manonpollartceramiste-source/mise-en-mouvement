import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { Button } from "@/app/components/ui/Button";
import { TestimonialCard } from "@/app/components/ui/TestimonialCard";
import { testimonials } from "@/lib/content/testimonials";
import { loadSettings } from "@/lib/content/settings.server";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadSettings();
  return {
    title: "Avis clients",
    description: `Ils nous ont fait confiance et partagent leur expérience du cabinet ${settings.companyName}.`,
  };
}

export default function AvisPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                Avis clients
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Leurs mots,
                <br />
                <span className="italic text-taupe-600">notre exigence.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                Quelques retours de personnes qui ont repris le sport avec nous.
                D’autres témoignages arriveront au fil des saisons.
              </p>
            </FadeIn>
          </Container>
        </Section>

        <Section className="border-t border-taupe-300/30 pt-0">
          <Container>
            <div className="grid gap-6 md:grid-cols-2">
              {testimonials.map((t, i) => (
                <Reveal key={t.author} delay={i * 0.1}>
                  <TestimonialCard testimonial={t} />
                </Reveal>
              ))}
            </div>
            <Reveal delay={0.2}>
              <div className="mt-16 flex flex-col items-center gap-6 text-center">
                <p className="max-w-md text-base leading-relaxed text-taupe-700">
                  Envie de tester ? La première séance Découverte est à 25 €
                  durant les deux premiers mois d’ouverture.
                </p>
                <Button href="/reservation" variant="primary">
                  Réserver ma première séance
                </Button>
              </div>
            </Reveal>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
