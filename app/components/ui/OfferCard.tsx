import Link from "next/link";
import type { Offer } from "@/lib/content/offers";

type OfferCardProps = {
  offer: Offer;
};

export function OfferCard({ offer }: OfferCardProps) {
  const isQuote = offer.totalCents === null;
  const ctaHref = isQuote
    ? `/contact?offre=${offer.id}`
    : `/reservation?offre=${offer.id}`;
  const ctaLabel = isQuote ? "Demander un devis" : "Réserver";

  return (
    <article
      className={`group relative flex flex-col rounded-3xl border p-8 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 ${
        offer.highlight
          ? "border-taupe-700 bg-taupe-700 text-sand-50 shadow-[0_30px_80px_-30px_rgba(15,14,12,0.5)] hover:shadow-[0_40px_100px_-30px_rgba(15,14,12,0.6)]"
          : "border-taupe-300/40 bg-sand-50 text-ink-900 hover:border-taupe-400/60 hover:shadow-[0_28px_70px_-30px_rgba(78,70,59,0.4)]"
      }`}
    >
      {offer.badge && (
        <span
          className={`absolute right-6 top-6 rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
            offer.highlight
              ? "bg-sand-50/15 text-sand-50"
              : "bg-taupe-200/60 text-taupe-700"
          }`}
        >
          {offer.badge}
        </span>
      )}

      <h3 className="font-serif text-2xl">{offer.name}</h3>
      <p
        className={`mt-2 text-sm ${
          offer.highlight ? "text-sand-200" : "text-taupe-600"
        }`}
      >
        {offer.description}
      </p>

      <div className="mt-6">
        <p className="font-serif text-3xl">{offer.priceLabel}</p>
      </div>

      <ul
        className={`mt-6 space-y-2 text-sm ${
          offer.highlight ? "text-sand-200" : "text-taupe-700"
        }`}
      >
        {offer.details.map((d) => (
          <li key={d} className="flex items-start gap-3">
            <span
              className={`mt-2 h-1 w-4 shrink-0 rounded-full ${
                offer.highlight ? "bg-sand-200" : "bg-taupe-400"
              }`}
            />
            {d}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          offer.highlight
            ? "bg-sand-50 text-ink-900 hover:bg-sand-100"
            : "bg-taupe-700 text-sand-50 hover:bg-taupe-800"
        }`}
      >
        {ctaLabel}
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
