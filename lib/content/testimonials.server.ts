import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import {
  testimonials as staticTestimonials,
  testimonialArraySchema,
  type Testimonial,
} from "@/lib/content/testimonials";

export async function loadTestimonials(): Promise<Testimonial[]> {
  const value = await readContentKey("testimonials");
  if (!value) return staticTestimonials;
  const parsed = testimonialArraySchema.safeParse(value);
  const items = parsed.success ? parsed.data : staticTestimonials;
  return [...items].sort((a, b) => a.order - b.order);
}

export async function loadVisibleTestimonials(): Promise<Testimonial[]> {
  const all = await loadTestimonials();
  return all.filter((t) => t.visible);
}
