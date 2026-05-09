import { z } from "zod";

export type PopupScope = "home" | "offres" | "both";

export type Popup = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  scope: PopupScope;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

export const popupInputSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  ctaLabel: z.string().nullable(),
  ctaHref: z.string().nullable(),
  scope: z.enum(["home", "offres", "both"]),
  active: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
});
export type PopupInput = z.infer<typeof popupInputSchema>;

export type PageScope = "home" | "offres";
