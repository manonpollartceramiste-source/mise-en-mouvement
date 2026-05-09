import "server-only";

import { readContentKey } from "@/lib/supabase/content";
import { faq as staticFaq, faqArraySchema, type FaqItem } from "@/lib/content/faq";

export async function loadFaq(): Promise<FaqItem[]> {
  const value = await readContentKey("faq");
  if (!value) return staticFaq;
  const parsed = faqArraySchema.safeParse(value);
  return parsed.success ? parsed.data : staticFaq;
}
