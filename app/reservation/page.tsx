import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { ReservationFlow } from "@/app/components/reservation/ReservationFlow";
import { loadActiveCoaches } from "@/lib/content/coaches.server";
import { loadOffers } from "@/lib/content/offers.server";
import { loadTexts } from "@/lib/content/texts.server";
import { textOrDefault } from "@/lib/content/texts";
import { FormattedText } from "@/app/components/ui/FormattedText";

export const metadata: Metadata = {
  title: "Réservation",
  description:
    "Réservez votre séance en ligne en moins de 2 minutes. Choisissez votre coach, votre formule et votre créneau.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const offerParam = typeof params.offre === "string" ? params.offre : undefined;
  const coachParam = typeof params.coach === "string" ? params.coach : undefined;
  const errorParam = typeof params.error === "string" ? params.error : undefined;

  const [offers, coaches, texts] = await Promise.all([
    loadOffers(),
    loadActiveCoaches(),
    loadTexts(),
  ]);
  const initialCoach = coaches.some((c) => c.id === coachParam)
    ? coachParam
    : undefined;

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                {textOrDefault(texts, "reservationEyebrow")}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                {textOrDefault(texts, "reservationTitle1")}
                <br />
                <span className="italic text-taupe-600">
                  {textOrDefault(texts, "reservationTitle2")}
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <FormattedText
                text={textOrDefault(texts, "reservationIntro")}
                topGap="mt-8"
                className="max-w-xl text-lg leading-relaxed text-taupe-700"
              />
            </FadeIn>
          </Container>
        </Section>

        {errorParam === "trop_tot" && (
          <Section className="pb-0 pt-4">
            <Container>
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800"
              >
                <span className="mt-px shrink-0 text-red-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                </span>
                <div>
                  <p className="font-semibold">Réservation impossible</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-red-700">
                    Les réservations doivent être effectuées au minimum 24h à l&apos;avance.
                    Veuillez choisir un créneau ultérieur ou{" "}
                    <a href="/contact" className="underline hover:text-red-900">contacter le cabinet</a>.
                  </p>
                </div>
              </div>
            </Container>
          </Section>
        )}

        <Section className="border-t border-taupe-300/30 pt-0">
          <Container>
            <FadeIn delay={0.1}>
              <ReservationFlow
                coaches={coaches}
                offers={offers}
                initialOfferId={offerParam}
                initialCoachId={initialCoach}
              />
            </FadeIn>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
