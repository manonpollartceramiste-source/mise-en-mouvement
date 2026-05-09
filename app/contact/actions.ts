"use server";

import { z } from "zod";
import { insertClient } from "@/lib/content/clients.server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(2, "Nom trop court."),
  email: z.email("Email invalide."),
  phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(10, "Message trop court."),
});

export type ContactState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: Partial<Record<keyof z.infer<typeof schema>, string>>;
};

export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const errors: ContactState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof schema>;
      if (!errors[key]) errors[key] = issue.message;
    }
    return {
      status: "error",
      message: "Certains champs sont invalides.",
      errors,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      status: "error",
      message:
        "Le formulaire n’est pas encore connecté. Réessayez dans quelques instants ou contactez-nous par email.",
    };
  }

  const subject = parsed.data.subject?.trim() || null;
  const offerId = subject?.startsWith("Demande de devis — ")
    ? null // l'offre est déjà mentionnée dans le sujet, pas besoin de double-stocker
    : null;

  const res = await insertClient({
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    phone: parsed.data.phone?.trim() || null,
    message: parsed.data.message.trim(),
    subject,
    offerId,
    coachId: null,
    source: "contact",
  });

  if (!res.ok) {
    return {
      status: "error",
      message: "Impossible d’enregistrer votre message. Réessayez.",
    };
  }

  return {
    status: "success",
    message:
      "Merci, votre message a bien été reçu. Nous vous répondons sous 24 h.",
  };
}
