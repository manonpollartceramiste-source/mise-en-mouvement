import { z } from "zod";

export type ClientSource = "contact" | "reservation";
export type ClientStatus = "nouveau" | "contacté" | "payé" | "annulé";

export const clientStatuses: ClientStatus[] = [
  "nouveau",
  "contacté",
  "payé",
  "annulé",
];

export const clientStatusLabel: Record<ClientStatus, string> = {
  nouveau: "Nouveau",
  contacté: "Contacté",
  payé: "Payé",
  annulé: "Annulé",
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  offerId: string | null;
  coachId: string | null;
  subject: string | null;
  source: ClientSource;
  status: ClientStatus;
  createdAt: string;
};

export const newClientSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().nullable(),
  message: z.string().nullable(),
  offerId: z.string().nullable(),
  coachId: z.string().nullable(),
  subject: z.string().nullable(),
  source: z.enum(["contact", "reservation"]),
});
export type NewClient = z.infer<typeof newClientSchema>;
