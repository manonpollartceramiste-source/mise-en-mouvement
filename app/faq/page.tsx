import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { Button } from "@/app/components/ui/Button";
import { FAQItem } from "@/app/components/ui/FAQItem";
import { loadFaq } from "@/lib/content/faq.server";

export const metadata: Metadata = {
  title: "Questions fréquentes",
  description:
    "Réponses aux questions les plus courantes : réservation, paiement, niveau requis.",
};

export default async function FAQPage() {
  const faq = await loadFaq();
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                Questions fréquentes
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Tout ce que vous
                <br />
                <span className="italic text-taupe-600">avez besoin de savoir.</span>
              </h1>
            </FadeIn>
          </Container>
        </Section>

        <Section className="border-t border-taupe-300/30 pt-0">
          <Container>
            <Reveal>
              <div className="mx-auto max-w-3xl rounded-3xl border border-taupe-300/40 bg-sand-50 px-8">
                {faq.map((item, i) => (
                  <FAQItem key={item.question} item={item} defaultOpen={i === 0} />
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="mx-auto mt-16 max-w-3xl rounded-3xl bg-taupe-700 p-10 text-center text-sand-50">
                <h2 className="font-serif text-3xl">
                  Vous ne trouvez pas votre réponse ?
                </h2>
                <p className="mx-auto mt-4 max-w-md text-sand-200">
                  Écrivez-nous, on vous répond sous 24 h ouvrées.
                </p>
                <div className="mt-8">
                  <Button
                    href="/contact"
                    variant="secondary"
                    className="bg-sand-50 text-ink-900 hover:bg-sand-100"
                  >
                    Nous contacter
                  </Button>
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
