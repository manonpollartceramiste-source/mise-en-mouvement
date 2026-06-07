import "server-only";
import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY manquante");
    _resend = new Resend(key);
  }
  return _resend;
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Mise en Mouvement <noreply@mise-en-mouvement.fr>";

export const CABINET_ADDRESS =
  process.env.CABINET_ADDRESS ?? "Cabinet Mise en Mouvement";

export const CABINET_ADMIN_EMAIL = process.env.CABINET_ADMIN_EMAIL ?? "";
