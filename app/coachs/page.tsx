import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";
import { Reveal } from "@/app/components/motion/Reveal";
import { loadActiveCoaches } from "@/lib/content/coaches.server";
import { loadImages } from "@/lib/content/images.server";

export const metadata: Metadata = {
  title: "Coachs",
  description:
    "Dorian Hébert et Grégory Nadal — deux coachs sportifs aux parcours complémentaires.",
};

export default async function CoachsPage() {
  const [coaches, images] = await Promise.all([
    loadActiveCoaches(),
    loadImages(),
  ]);
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                Vos coachs
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Deux expertises,
                <br />
                <span className="italic text-taupe-600">une même exigence.</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="mt-8 max-w-xl text-lg leading-relaxed text-taupe-700">
                Préparation physique, réathlétisation, pilates, handball : nos
                approches se complètent pour vous accompagner sur la durée.
              </p>
            </FadeIn>
          </Container>
        </Section>

        <Section className="border-t border-taupe-300/30 bg-sand-100/40 pt-16">
          <Container className="space-y-32">
            {coaches.map((coach, i) => {
              const photo = images.coaches[coach.id];
              return (
              <Reveal key={coach.id}>
                <article
                  id={coach.id}
                  className={`grid gap-12 md:grid-cols-2 md:items-center ${
                    i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div className="flex justify-center">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={coach.name}
                        className="h-72 w-72 rounded-full object-cover shadow-[inset_0_-30px_60px_rgba(0,0,0,0.15)]"
                      />
                    ) : (
                      <div className="flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-taupe-300 to-taupe-600 font-serif text-7xl text-sand-50 shadow-[inset_0_-30px_60px_rgba(0,0,0,0.15)]">
                        {coach.initials}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
                      {coach.shortRole}
                    </p>
                    <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                      {coach.name}
                    </h2>
                    <p className="mt-3 text-sm font-medium text-taupe-600">
                      {coach.role}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-wider text-taupe-500">
                      {coach.diploma}
                    </p>
                    <p className="mt-6 text-base leading-relaxed text-taupe-700">
                      {coach.bio}
                    </p>
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
                    <Link
                      href={`/reservation?coach=${coach.id}`}
                      className="mt-10 inline-flex items-center gap-2 rounded-full bg-taupe-700 px-6 py-3 text-sm font-medium text-sand-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.02] hover:bg-taupe-800"
                    >
                      Réserver avec {coach.name.split(" ")[0]}
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </article>
              </Reveal>
              );
            })}
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
