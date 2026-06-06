"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Cal, { getCalApi } from "@calcom/embed-react";
import type { EmbedEvent } from "@calcom/embed-react";
import { type Coach } from "@/lib/content/coaches";
import {
  isCoachAllowed,
  type Offer,
} from "@/lib/content/offers";
import { isWithinMinNotice, MIN_NOTICE_HOURS } from "@/lib/utils/booking-rules";

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

  const selectedOffer: Offer | undefined = bookableOffers.find(
    (o) => o.id === effectiveOfferId,
  );
  const selectedCoach: Coach | undefined = coaches.find((c) => c.id === coachId);

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
          <CalcomEmbed
                coach={selectedCoach}
                coachId={coachId}
                offerId={effectiveOfferId}
              />
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
          <p className="mt-8 text-xs leading-relaxed text-taupe-500">
            Vous pourrez choisir votre mode de règlement après confirmation
            de votre réservation.
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

function extractCalInfo(url: string): { calLink: string; calOrigin: string } {
  const match = url.match(/^(https?:\/\/(?:app\.)?cal\.com)\/(.*)/);
  if (match) return { calLink: match[2], calOrigin: match[1] };
  return { calLink: url, calOrigin: "https://cal.com" };
}

function CalcomEmbed({
  coach,
  coachId,
  offerId,
}: {
  coach: Coach | undefined;
  coachId: string;
  offerId: string;
}) {
  const [tooSoon, setTooSoon] = useState(false);

  // Refs keep latest coach/offer values accessible inside the stable listener
  const coachIdRef = useRef(coachId);
  const offerIdRef = useRef(offerId);
  useEffect(() => { coachIdRef.current = coachId; }, [coachId]);
  useEffect(() => { offerIdRef.current = offerId; }, [offerId]);

  // Register the bookingSuccessfulV2 listener once; clean up with cal("off")
  useEffect(() => {
    let cancelled = false;
    let calApi: Awaited<ReturnType<typeof getCalApi>> | null = null;

    const handleBooking = (e: EmbedEvent<"bookingSuccessfulV2">) => {
      const { uid, startTime } = e.detail.data;

      // Garde de sécurité : bloquer si le créneau est dans moins de 24h
      if (isWithinMinNotice(startTime)) {
        setTooSoon(true);
        return;
      }

      const p = new URLSearchParams();
      if (coachIdRef.current) p.set("coach", coachIdRef.current);
      if (offerIdRef.current) p.set("offre", offerIdRef.current);
      if (uid) p.set("bookingUid", uid);
      if (startTime) p.set("startTime", startTime);
      window.location.href = `/reservation/confirmation?${p.toString()}`;
    };

    (async () => {
      calApi = await getCalApi();
      if (cancelled) return;
      calApi("on", { action: "bookingSuccessfulV2", callback: handleBooking });
    })();

    return () => {
      cancelled = true;
      calApi?.("off", { action: "bookingSuccessfulV2", callback: handleBooking });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const { calLink, calOrigin } = extractCalInfo(coach.calcomUrl);

  return (
    <div className="mt-6 space-y-3">
      {/* Notice permanente préavis minimum */}
      <div className="flex items-start gap-3 rounded-xl border border-taupe-300/40 bg-sand-100/60 px-4 py-3 text-xs text-taupe-600">
        <span className="mt-px shrink-0 text-taupe-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </span>
        <span>
          Les réservations doivent être effectuées au minimum{" "}
          <strong className="font-semibold text-taupe-700">{MIN_NOTICE_HOURS}h à l&apos;avance.</strong>
          {" "}Les créneaux disponibles dans le calendrier respectent cette règle.
        </span>
      </div>

      {/* Erreur si créneau trop proche (garde de sécurité) */}
      {tooSoon && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800"
        >
          <span className="mt-px shrink-0 text-red-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <div>
            <p className="font-semibold">Réservation impossible</p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-700">
              Les réservations doivent être effectuées au minimum {MIN_NOTICE_HOURS}h à l&apos;avance.
              Veuillez choisir un créneau ultérieur ou{" "}
              <a href="/contact" className="underline hover:text-red-900">contacter le cabinet</a>.
            </p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-sand-50">
        <Cal
          calLink={calLink}
          calOrigin={calOrigin}
          style={{ width: "100%", minHeight: "640px" }}
        />
      </div>
    </div>
  );
}
