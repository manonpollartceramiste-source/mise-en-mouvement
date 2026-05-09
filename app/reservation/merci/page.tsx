import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";

export const metadata: Metadata = {
  title: "Merci — Réservation confirmée",
  description: "Votre réservation est confirmée. À très bientôt.",
};

export default function MerciPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="py-32 sm:py-40">
          <Container>
            <div className="mx-auto max-w-2xl text-center">
              <FadeIn>
                <span
                  aria-hidden
                  className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-taupe-400/60 text-2xl text-taupe-600"
                >
                  ✓
                </span>
              </FadeIn>
              <FadeIn delay={0.1}>
                <h1 className="mt-8 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                  Merci, votre réservation est confirmée.
                </h1>
              </FadeIn>
              <FadeIn delay={0.2}>
                <p className="mt-6 text-base leading-relaxed text-taupe-700">
                  Vous recevrez un email de confirmation dans quelques instants
                  avec votre reçu de paiement et le détail de votre créneau. À
                  très bientôt au cabinet.
                </p>
              </FadeIn>
              <FadeIn delay={0.3}>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-6 py-3 text-sm font-medium text-sand-50 transition-all hover:bg-taupe-800"
                  >
                    Retour à l’accueil
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full border border-taupe-300/40 bg-sand-100 px-6 py-3 text-sm font-medium text-ink-900 transition-all hover:bg-sand-200"
                  >
                    Une question ?
                  </Link>
                </div>
              </FadeIn>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
