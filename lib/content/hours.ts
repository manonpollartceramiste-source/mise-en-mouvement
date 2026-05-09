import { z } from "zod";

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const dayLabels: Record<DayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

export const dayKeys: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export type DaySchedule = {
  day: DayKey;
  closed: boolean;
  open: string; // "HH:MM"
  close: string; // "HH:MM"
};

export type OpeningHours = DaySchedule[];

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const dayScheduleSchema = z.object({
  day: z.enum([
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]),
  closed: z.boolean(),
  open: z.string().regex(timePattern, "Heure invalide (HH:MM)"),
  close: z.string().regex(timePattern, "Heure invalide (HH:MM)"),
}) satisfies z.ZodType<DaySchedule>;

export const openingHoursSchema = z.array(dayScheduleSchema).length(7);

export const defaultHours: OpeningHours = [
  { day: "monday", closed: false, open: "08:00", close: "20:00" },
  { day: "tuesday", closed: false, open: "08:00", close: "20:00" },
  { day: "wednesday", closed: false, open: "08:00", close: "20:00" },
  { day: "thursday", closed: false, open: "08:00", close: "20:00" },
  { day: "friday", closed: false, open: "08:00", close: "20:00" },
  { day: "saturday", closed: false, open: "09:00", close: "13:00" },
  { day: "sunday", closed: true, open: "00:00", close: "00:00" },
];
