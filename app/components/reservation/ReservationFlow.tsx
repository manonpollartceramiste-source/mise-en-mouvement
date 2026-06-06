"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { type Coach } from "@/lib/content/coaches";
import { isCoachAllowed, type Offer } from "@/lib/content/offers";
import { NativeSlotPicker } from "./NativeSlotPicker";

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

  const visibleOffers = useMemo(() => {
    if (!coachId) return bookableOffers;
    return bookableOffers.filter((o) => isCoachAllowed(o, coachId));
  }, [bookableOffers, coachId]);

  const effectiveOfferId = useMemo(() => {
    if (requestedOfferId && visibleOffers.some((o) => o.id === requestedOfferId)) {
      return requestedOfferId;
    }
    return visibleOffers[0]?.id ?? "";
  }, [requestedOfferId, visibleOffers]);

  const selectedOffer = bookableOffers.find((o) => o.id === effectiveOfferId);
  const selectedCoach = coaches.find((c) => c.id === coachId);

  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-10">
        {/* Step 1 — Coach */}
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
                  <p className={`mt-1 text-xs uppercase tracking-wider ${active ? "text-sand-200" : "text-taupe-500"}`}>
                    {c.shortRole}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Step 2 — Offer */}
        <section>
          <h2 className="font-serif text-2xl text-ink-900">2. Votre offre</h2>
          <p className="mt-2 text-sm text-taupe-600">
            {coachId
              ? "Offres disponibles avec ce coach."
              : "Toutes les offres. Sélectionnez d'abord un coach pour filtrer."}{" "}
            Les programmes sur devis se réservent depuis la{" "}
            <a href="/contact" className="underline">page contact</a>.
          </p>
          {visibleOffers.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/40 p-6 text-sm text-taupe-700">
              Aucune offre n&apos;est disponible avec ce coach pour l&apos;instant.
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
                      <span className={`mt-0.5 block text-xs ${active ? "text-sand-200" : "text-taupe-500"}`}>
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

        {/* Step 3 — Slot */}
        <section>
          <h2 className="font-serif text-2xl text-ink-900">3. Votre créneau</h2>
          <p className="mt-2 text-sm text-taupe-600">
            Sélectionnez la date et l&apos;heure qui vous conviennent.
          </p>
          <SlotSection coach={selectedCoach} offer={selectedOffer} />
        </section>
      </div>

      {/* Sidebar summary */}
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
            <Row label="Prix" value={selectedOffer?.priceLabel ?? "—"} emphasis />
          </div>
          <p className="mt-8 text-xs leading-relaxed text-taupe-500">
            Vous pourrez choisir votre mode de règlement après confirmation
            de votre réservation.
          </p>
        </motion.div>
      </aside>
    </div>
  );
}

// ── Row ────────────────────────────────────────────────────────────────────

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-taupe-300/30 pb-3 last:border-b-0">
      <span className="text-taupe-500">{label}</span>
      <span className={emphasis ? "font-serif text-2xl text-ink-900" : "font-medium text-ink-900"}>
        {value}
      </span>
    </div>
  );
}

// ── SlotSection ────────────────────────────────────────────────────────────

function resolveSumupUrl(offer: Offer | undefined, coach: Coach | undefined): string | null {
  if (offer && coach) {
    const link = offer.coachLinks[coach.id];
    if (link?.sumup) return link.sumup;
  }
  return coach?.sumupUrl ?? null;
}

function SlotSection({
  coach,
  offer,
}: {
  coach: Coach | undefined;
  offer: Offer | undefined;
}) {
  if (!coach) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/40 p-8 text-center">
        <p className="font-serif text-lg text-ink-900">
          Sélectionnez d&apos;abord votre coach
        </p>
        <p className="mt-2 text-sm text-taupe-600">
          Le calendrier de réservation s&apos;affiche une fois le coach choisi.
        </p>
      </div>
    );
  }

  if (!coach.osProfileId || !offer) {
    return (
      <div className="mt-6 rounded-2xl border border-taupe-300/40 bg-sand-100/40 p-8 text-center">
        <p className="font-serif text-lg text-ink-900">
          Réservation en ligne non disponible
        </p>
        <p className="mt-2 text-sm text-taupe-600">
          Contactez-nous directement pour réserver avec ce coach.
        </p>
        <a
          href="/contact"
          className="mt-4 inline-block rounded-xl bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-800"
        >
          Nous contacter
        </a>
      </div>
    );
  }

  return (
    <NativeSlotPicker
      coachId={coach.osProfileId}
      coachName={coach.name}
      offer={offer}
      sumupUrl={resolveSumupUrl(offer, coach)}
      onBack={() => {}}
    />
  );
}
