import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { ContactForm } from "./ContactForm";
import { loadOffer } from "@/lib/content/offers.server";
import { loadHours } from "@/lib/content/hours.server";
import { dayLabels } from "@/lib/content/hours";
import { loadLegal } from "@/lib/content/legal.server";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question, un projet sur mesure ? Écrivez-nous, nous vous répondons sous 24 h.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ContactPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const offerId = typeof params.offre === "string" ? params.offre : undefined;
  const offer = offerId ? await loadOffer(offerId) : undefined;
  const prefilledSubject = offer
    ? `Demande de devis — ${offer.name}`
    : undefined;
  const [hours, legal] = await Promise.all([loadHours(), loadLegal()]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                Contact
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Une question,
                <br />
                <span className="italic text-taupe-600">un projet sur mesure ?</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                Écrivez-nous : nous vous répondons sous 24 h ouvrées. Pour les
                programmes 4/8/12 semaines ou Premium, indiquez vos objectifs et
                vos disponibilités.
              </p>
            </FadeIn>
          </Container>
        </Section>

        <Section className="border-t border-taupe-300/30 pt-0">
          <Container>
            <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
              <Reveal>
                <ContactForm prefilledSubject={prefilledSubject} />
              </Reveal>
              <Reveal delay={0.1}>
                <aside className="space-y-6 rounded-3xl border border-taupe-300/40 bg-sand-100/40 p-8">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      Email
                    </p>
                    <a
                      href={`mailto:${legal.contactEmail}`}
                      className="mt-2 block font-serif text-xl text-ink-900 hover:text-taupe-700"
                    >
                      {legal.contactEmail}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      Délai de réponse
                    </p>
                    <p className="mt-2 text-base text-ink-900">
                      Sous 24 h ouvrées
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      Horaires d’ouverture
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-taupe-700">
                      {hours.map((d) => (
                        <li
                          key={d.day}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <span>{dayLabels[d.day]}</span>
                          <span className="text-ink-900">
                            {d.closed
                              ? "Fermé"
                              : `${d.open} – ${d.close}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      Réservation directe
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-taupe-700">
                      Pour les séances et cartes, vous pouvez réserver en
                      ligne sans passer par ce formulaire.
                    </p>
                  </div>
                </aside>
              </Reveal>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
