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
import { loadSettings } from "@/lib/content/settings.server";
import { loadTexts } from "@/lib/content/texts.server";
import { textOrDefault } from "@/lib/content/texts";
import { FormattedText } from "@/app/components/ui/FormattedText";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Une question, un projet sur mesure ? Écrivez-nous, nous vous répondons sous 24 h.",
};

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 8h2.5V4.5h-2.5c-2 0-3.5 1.5-3.5 3.5v2H9v3.5h2.5V21H15v-7.5h2.5L18 10h-3V8c0-.6.4-1 .8-1Z" />
    </svg>
  );
}

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
  const [hours, settings, texts] = await Promise.all([
    loadHours(),
    loadSettings(),
    loadTexts(),
  ]);
  const fullAddress = [
    settings.address,
    [settings.postalCode, settings.city].filter(Boolean).join(" "),
  ]
    .filter((s) => s.trim().length > 0)
    .join("\n");

  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                {textOrDefault(texts, "contactEyebrow")}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                {textOrDefault(texts, "contactTitle1")}
                <br />
                <span className="italic text-taupe-600">
                  {textOrDefault(texts, "contactTitle2")}
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <FormattedText
                text={textOrDefault(texts, "contactIntro")}
                topGap="mt-8"
                className="max-w-xl text-lg leading-relaxed text-taupe-700"
              />
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
                      href={`mailto:${settings.email}`}
                      className="mt-2 block font-serif text-xl text-ink-900 hover:text-taupe-700"
                    >
                      {settings.email}
                    </a>
                  </div>
                  {settings.phone.trim().length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                        Téléphone
                      </p>
                      <a
                        href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                        className="mt-2 block text-base text-ink-900 hover:text-taupe-700"
                      >
                        {settings.phone}
                      </a>
                    </div>
                  )}
                  {fullAddress.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                        Adresse
                      </p>
                      <p
                        className="mt-2 whitespace-pre-line text-base text-ink-900"
                      >
                        {fullAddress}
                      </p>
                      {settings.googleMapsUrl.trim().length > 0 && (
                        <a
                          href={settings.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-taupe-700 underline hover:text-ink-900"
                        >
                          Voir sur Google Maps →
                        </a>
                      )}
                    </div>
                  )}
                  {(settings.instagramUrl.trim().length > 0 ||
                    settings.facebookUrl.trim().length > 0) && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                        Réseaux
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-taupe-700">
                        {settings.instagramUrl.trim().length > 0 && (
                          <a
                            href={settings.instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Instagram"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-taupe-300/50 transition-colors hover:border-taupe-500 hover:text-ink-900"
                          >
                            <InstagramIcon />
                          </a>
                        )}
                        {settings.facebookUrl.trim().length > 0 && (
                          <a
                            href={settings.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Facebook"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-taupe-300/50 transition-colors hover:border-taupe-500 hover:text-ink-900"
                          >
                            <FacebookIcon />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      {textOrDefault(texts, "contactDelayLabel")}
                    </p>
                    <p className="mt-2 text-base text-ink-900">
                      {textOrDefault(texts, "contactDelayValue")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      {textOrDefault(texts, "contactHoursLabel")}
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
                      {textOrDefault(texts, "contactBookingLabel")}
                    </p>
                    <FormattedText
                      text={textOrDefault(texts, "contactBookingText")}
                      topGap="mt-2"
                      className="text-sm leading-relaxed text-taupe-700"
                    />
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
