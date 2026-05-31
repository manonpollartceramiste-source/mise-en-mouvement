import type { Testimonial } from "@/lib/content/testimonials";

type TestimonialCardProps = {
  testimonial: Testimonial;
};

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-taupe-300/30 bg-sand-50 p-8">
      <div
        className="flex gap-0.5"
        aria-label={`Note : ${testimonial.rating} sur 5`}
      >
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className={
              i < testimonial.rating ? "text-taupe-600" : "text-taupe-200"
            }
          >
            ★
          </span>
        ))}
      </div>
      <span
        aria-hidden
        className="mt-4 font-serif text-5xl leading-none text-taupe-400"
      >
        "
      </span>
      <blockquote className="mt-2 grow whitespace-pre-line text-base leading-relaxed text-ink-900">
        {testimonial.quote}
      </blockquote>
      <figcaption className="mt-6">
        <p className="text-sm font-medium text-taupe-600">
          — {testimonial.author}
        </p>
        {(testimonial.context || testimonial.date) && (
          <p className="mt-1 text-xs text-taupe-400">
            {[testimonial.context, testimonial.date].filter(Boolean).join(" · ")}
          </p>
        )}
      </figcaption>
    </figure>
  );
}
