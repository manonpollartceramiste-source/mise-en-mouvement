import Link from "next/link";
import type { Coach } from "@/lib/content/coaches";
import { FormattedText } from "./FormattedText";

type CoachCardProps = {
  coach: Coach;
  variant?: "compact" | "full";
  photoUrl?: string | null;
};

export function CoachCard({
  coach,
  variant = "compact",
  photoUrl,
}: CoachCardProps) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-taupe-300/30 bg-sand-50 p-8 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-taupe-400/60 hover:shadow-[0_28px_70px_-30px_rgba(78,70,59,0.45)]">
      <CoachAvatar initials={coach.initials} photoUrl={photoUrl} />
      <div className="mt-6 space-y-2">
        <h3 className="font-serif text-2xl text-ink-900">{coach.name}</h3>
        <p className="text-sm font-medium text-taupe-600">{coach.role}</p>
        <p className="text-xs uppercase tracking-wider text-taupe-500">
          {coach.diploma}
        </p>
      </div>
      <FormattedText
        text={coach.bio}
        topGap="mt-5"
        className="text-base leading-relaxed text-taupe-700"
        paraGap="mt-3"
      />
      {variant === "full" && (
        <ul className="mt-6 space-y-2">
          {coach.highlights.map((h) => (
            <li
              key={h}
              className="flex items-center gap-3 text-sm text-taupe-700"
            >
              <span className="h-1 w-6 rounded-full bg-taupe-400" />
              {h}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/reservation?coach=${coach.id}`}
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-ink-900 transition-all hover:gap-3"
      >
        Réserver avec {coach.name.split(" ")[0]}
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}

function CoachAvatar({
  initials,
  photoUrl,
}: {
  initials: string;
  photoUrl?: string | null;
}) {
  if (photoUrl) {
    return (
      <div className="img-coach-circle h-24 w-24 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt="" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-taupe-300 to-taupe-500 font-serif text-3xl text-sand-50 shadow-[inset_0_-8px_20px_rgba(0,0,0,0.15)]">
      {initials}
    </div>
  );
}
