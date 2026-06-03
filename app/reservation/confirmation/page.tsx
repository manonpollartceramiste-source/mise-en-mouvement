import type { Metadata } from "next";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { loadOffers } from "@/lib/content/offers.server";
import { loadCoaches } from "@/lib/content/coaches.server";
import { ConfirmationClient } from "./ConfirmationClient";
import type { Offer } from "@/lib/content/offers";
import type { Coach } from "@/lib/content/coaches";

export const metadata: Metadata = {
  title: "Rendez-vous confirmé — Mise en Mouvement",
  description: "Votre rendez-vous est confirmé. Choisissez votre mode de règlement.",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function resolveSumupUrl(
  offer: Offer | undefined,
  coach: Coach | undefined,
): string | null {
  if (offer && coach) {
    const link = offer.coachLinks[coach.id];
    if (link?.sumup) return link.sumup;
  }
  if (coach?.sumupUrl) return coach.sumupUrl;
  return null;
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const coachParam = str(params.coach);
  const offreParam = str(params.offre) ?? str(params.offer);
  const nameParam = str(params.name);
  const dateParam = str(params.date) ?? str(params.startTime);

  const [offers, coaches] = await Promise.all([loadOffers(), loadCoaches()]);

  const matchedCoach = coachParam
    ? coaches.find((c) => c.id === coachParam)
    : undefined;
  const matchedOffer = offreParam
    ? offers.find((o) => o.id === offreParam)
    : undefined;

  const sumupUrl = resolveSumupUrl(matchedOffer, matchedCoach);

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="py-32 sm:py-40">
          <Container>
            <ConfirmationClient
              name={nameParam}
              coachName={matchedCoach?.name ?? null}
              offerName={matchedOffer?.name ?? null}
              date={dateParam}
              sumupUrl={sumupUrl}
            />
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
