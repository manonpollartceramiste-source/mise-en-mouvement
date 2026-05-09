"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { type Coach } from "@/lib/content/coaches";
import {
  isCoachAllowed,
  resolveBookingLink,
  type Offer,
} from "@/lib/content/offers";

type Props = {
  coaches: Coach[];
  offers: Offer[];
  initialOfferId?: string;
  initialCoachId?: string;
};

export function ReservationFlow({
  coaches,
  offers,
  initialOfferId,
  initialCoachId,
}: Props) {
  const bookableOffers = useMemo(
    () => offers.filter((o) => o.totalCents !== null),
    [offers],
  );

  const [coachId, setCoachId] = useState<string>(initialCoachId ?? "");
  const [requestedOfferId, setRequestedOfferId] = useState<string>(
    initialOfferId ?? "",
  );

  // Offres visibles selon le coach sélectionné
  const visibleOffers = useMemo(() => {
    if (!coachId) return bookableOffers;
    return bookableOffers.filter((o) => isCoachAllowed(o, coachId));
  }, [bookableOffers, coachId]);

  // Offre effective : la demande utilisateur si valide, sinon la 1re visible.
  const effectiveOfferId = useMemo(() => {
    if (
      requestedOfferId &&
      visibleOffers.some((o) => o.id === requestedOfferId)
    ) {
      return requestedOfferId;
    }
    return visibleOffers[0]?.id ?? "";
  }, [requestedOfferId, visibleOffers]);

  const [error, setError] = useState<string | null>(null);

  const selectedOffer: Offer | undefined = bookableOffers.find(
    (o) => o.id === effectiveOfferId,
  );
  const selectedCoach: Coach | undefined = coaches.find((c) => c.id === coachId);

  const resolved =
    selectedOffer && selectedCoach
      ? resolveBookingLink(selectedOffer, selectedCoach)
      : { url: null, isPayment: false };
  const bookingLink = resolved.url;
  const isSumup = resolved.isPayment;
  const ctaLabel = isSumup ? "Procéder au paiement" : "Réserver via Cal.com";

  function handleCheckout() {
    if (!selectedOffer || !selectedCoach) {
      setError("Sélectionnez une offre et un coach.");
      return;
    }
    if (!isCoachAllowed(selectedOffer, selectedCoach.id)) {
      setError(
        `${selectedCoach.name} n’assure pas cette offre. Choisissez un autre coach ou une autre offre.`,
      );
      return;
    }
    if (!bookingLink) {
      setError(
        "Aucun lien de réservation configuré pour ce duo offre/coach. Contactez-nous.",
      );
      return;
    }
    setError(null);
    window.location.href = bookingLink;
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-10">
        <section>
          <h2 className="font-serif text-2xl text-ink-900">1. Votre coach</h2>
          <p className="mt-2 text-sm text-taupe-600">
            Choisissez le coach avec qui vous souhaitez pratiquer.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {coaches.map((c) => {
              const active = coachId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCoachId(c.id)}
                  className={`rounded-2xl border p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                    active
                      ? "border-taupe-700 bg-taupe-700 text-sand-50"
                      : "border-taupe-300/40 bg-sand-50 hover:border-taupe-400/60"
                  }`}
                  aria-pressed={active}
                >
                  <p className="font-serif text-lg">{c.name}</p>
                  <p
                    className={`mt-1 text-xs uppercase tracking-wider ${
                      active ? "text-sand-200" : "text-taupe-500"
                    }`}
                  >
                    {c.shortRole}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl text-ink-900">2. Votre offre</h2>
          <p className="mt-2 text-sm text-taupe-600">
            {coachId
              ? "Offres disponibles avec ce coach."
              : "Toutes les offres. Sélectionne d'abord un coach pour filtrer."}{" "}
            Les programmes sur devis se réservent depuis la{" "}
            <a href="/contact" className="underline">
              page contact
            </a>
            .
          </p>
          {visibleOffers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/40 p-6 text-sm text-taupe-700">
              Aucune offre n’est disponible avec ce coach pour l’instant.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {visibleOffers.map((o) => {
                const active = effectiveOfferId === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setRequestedOfferId(o.id)}
                    className={`flex w-full items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-all duration-300 ${
                      active
                        ? "border-taupe-700 bg-taupe-700 text-sand-50"
                        : "border-taupe-300/40 bg-sand-50 hover:border-taupe-400/60"
                    }`}
                    aria-pressed={active}
                  >
                    <span>
                      <span className="block font-serif text-lg">{o.name}</span>
                      <span
                        className={`mt-0.5 block text-xs ${
                          active ? "text-sand-200" : "text-taupe-500"
                        }`}
                      >
                        {o.description}
                      </span>
                    </span>
                    <span className="font-serif text-lg">{o.priceLabel}</span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-serif text-2xl text-ink-900">3. Votre créneau</h2>
          <p className="mt-2 text-sm text-taupe-600">
            Sélectionnez la date et l’heure qui vous conviennent.
          </p>
          <CalcomEmbed coach={selectedCoach} />
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <motion.div
          layout
          className="rounded-3xl border border-taupe-300/40 bg-sand-50 p-8"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
            Récapitulatif
          </p>
          <div className="mt-6 space-y-4 text-sm">
            <Row label="Coach" value={selectedCoach?.name ?? "—"} />
            <Row label="Formule" value={selectedOffer?.name ?? "—"} />
            <Row
              label="Prix"
              value={selectedOffer?.priceLabel ?? "—"}
              emphasis
            />
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            disabled={!selectedOffer || !coachId}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-taupe-700 px-6 py-4 text-sm font-medium text-sand-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-taupe-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {ctaLabel}
            <span aria-hidden>→</span>
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
          <p className="mt-4 text-xs leading-relaxed text-taupe-500">
            {isSumup
              ? "Paiement sécurisé. Vous serez redirigé vers la page de paiement après validation."
              : "Vous serez redirigé vers le calendrier du coach pour finaliser votre réservation."}
          </p>
        </motion.div>
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-taupe-300/30 pb-3 last:border-b-0">
      <span className="text-taupe-500">{label}</span>
      <span
        className={
          emphasis
            ? "font-serif text-2xl text-ink-900"
            : "font-medium text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

function CalcomEmbed({ coach }: { coach: Coach | undefined }) {
  if (!coach) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/40 p-8 text-center">
        <p className="font-serif text-lg text-ink-900">
          Sélectionnez d’abord votre coach
        </p>
        <p className="mt-2 text-sm text-taupe-600">
          Le calendrier de réservation s’affiche une fois le coach choisi.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-taupe-300/40 bg-sand-50">
      <iframe
        title={`Calendrier Cal.com — ${coach.name}`}
        src={coach.calcomUrl}
        className="h-[640px] w-full"
        loading="lazy"
      />
    </div>
  );
}
