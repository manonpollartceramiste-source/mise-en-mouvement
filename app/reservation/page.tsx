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
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                {textOrDefault(texts, "reservationIntro")}
              </p>
            </FadeIn>
          </Container>
        </Section>

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
