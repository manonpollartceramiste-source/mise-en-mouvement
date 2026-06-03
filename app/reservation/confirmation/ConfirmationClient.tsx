"use client";

import { useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/app/components/motion/FadeIn";

type Props = {
  name: string | null;
  coachName: string | null;
  offerName: string | null;
  date: string | null;
  sumupUrl: string | null;
};

export function ConfirmationClient({
  name,
  coachName,
  offerName,
  date,
  sumupUrl,
}: Props) {
  const [paidAtCabinet, setPaidAtCabinet] = useState(false);

  const hasOnlinePayment = !!sumupUrl;

  const formattedDate = date
    ? (() => {
        try {
          return new Intl.DateTimeFormat("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(date));
        } catch {
          return date;
        }
      })()
    : null;

  return (
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
          Votre rendez-vous est confirmé
        </h1>
      </FadeIn>

      {(name || coachName || offerName || formattedDate) && (
        <FadeIn delay={0.15}>
          <div className="mx-auto mt-8 max-w-sm rounded-2xl border border-taupe-300/40 bg-sand-50 p-6 text-left text-sm">
            {name && (
              <div className="flex justify-between gap-4 border-b border-taupe-300/30 pb-3">
                <span className="text-taupe-500">Client</span>
                <span className="font-medium text-ink-900">{name}</span>
              </div>
            )}
            {coachName && (
              <div className="flex justify-between gap-4 border-b border-taupe-300/30 py-3">
                <span className="text-taupe-500">Coach</span>
                <span className="font-medium text-ink-900">{coachName}</span>
              </div>
            )}
            {offerName && (
              <div className="flex justify-between gap-4 border-b border-taupe-300/30 py-3">
                <span className="text-taupe-500">Formule</span>
                <span className="font-medium text-ink-900">{offerName}</span>
              </div>
            )}
            {formattedDate && (
              <div className="flex justify-between gap-4 pt-3">
                <span className="text-taupe-500">Date</span>
                <span className="font-medium text-ink-900 text-right">
                  {formattedDate}
                </span>
              </div>
            )}
          </div>
        </FadeIn>
      )}

      {!paidAtCabinet ? (
        <>
          <FadeIn delay={0.2}>
            <p className="mt-8 text-base leading-relaxed text-taupe-700">
              Merci pour votre réservation. Vous pouvez régler maintenant en
              ligne ou directement au cabinet.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="mt-10 flex flex-col items-center gap-4">
              {hasOnlinePayment ? (
                <a
                  href={sumupUrl!}
                  className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-taupe-700 px-6 py-4 text-sm font-medium text-sand-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-taupe-800"
                >
                  Procéder au paiement
                  <span aria-hidden>→</span>
                </a>
              ) : (
                <p className="rounded-2xl border border-taupe-300/40 bg-sand-100/60 px-6 py-4 text-sm text-taupe-700">
                  Le paiement en ligne n&apos;est pas disponible pour cette
                  réservation. Vous pourrez régler au cabinet.
                </p>
              )}

              <button
                type="button"
                onClick={() => setPaidAtCabinet(true)}
                className="inline-flex w-full max-w-xs items-center justify-center gap-2 rounded-full border border-taupe-300/40 bg-transparent px-6 py-3 text-sm font-medium text-taupe-700 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-taupe-400/70 hover:bg-sand-100"
              >
                Payer au cabinet
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <p className="mt-6 text-xs leading-relaxed text-taupe-500">
              Le paiement au cabinet se fera avant la séance.
            </p>
          </FadeIn>
        </>
      ) : (
        <FadeIn>
          <div className="mt-8">
            <p className="text-base leading-relaxed text-taupe-700">
              Votre rendez-vous est confirmé. Vous pourrez régler directement
              au cabinet le jour de la séance.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-6 py-3 text-sm font-medium text-sand-50 transition-all hover:bg-taupe-800"
              >
                Retour à l&apos;accueil
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-taupe-300/40 bg-sand-100 px-6 py-3 text-sm font-medium text-ink-900 transition-all hover:bg-sand-200"
              >
                Une question ?
              </Link>
            </div>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
