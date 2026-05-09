import type { Testimonial } from "@/lib/content/testimonials";

type TestimonialCardProps = {
  testimonial: Testimonial;
};

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  return (
    <figure className="flex h-full flex-col rounded-3xl border border-taupe-300/30 bg-sand-50 p-8">
      <span
        aria-hidden
        className="font-serif text-5xl leading-none text-taupe-400"
      >
        “
      </span>
      <blockquote className="mt-2 grow text-base leading-relaxed text-ink-900">
        {testimonial.quote}
      </blockquote>
      <figcaption className="mt-6 text-sm font-medium text-taupe-600">
        — {testimonial.author}
      </figcaption>
    </figure>
  );
}
