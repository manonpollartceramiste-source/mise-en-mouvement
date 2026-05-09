import type { ReactNode } from "react";
import { Container } from "@/app/components/ui/Container";
import { Section } from "@/app/components/ui/Section";
import { Header } from "@/app/components/sections/Header";
import { Footer } from "@/app/components/sections/Footer";
import { FadeIn } from "@/app/components/motion/FadeIn";

type Props = {
  eyebrow: string;
  title: string;
  children: ReactNode;
};

export function LegalLayout({ eyebrow, title, children }: Props) {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Section className="pt-20 sm:pt-28">
          <Container>
            <FadeIn>
              <p className="text-sm uppercase tracking-[0.25em] text-taupe-500">
                {eyebrow}
              </p>
            </FadeIn>
            <FadeIn delay={0.1}>
              <h1 className="mt-6 max-w-3xl font-serif text-4xl leading-[1.1] tracking-tight text-ink-900 sm:text-5xl">
                {title}
              </h1>
            </FadeIn>
          </Container>
        </Section>
        <Section className="pt-0">
          <Container>
            <FadeIn delay={0.1}>
              <article className="prose-legal mx-auto max-w-3xl space-y-6 text-base leading-relaxed text-taupe-700 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-ink-900 [&_h2]:mt-10 [&_p]:mt-3 [&_a]:text-ink-900 [&_a]:underline">
                {children}
              </article>
            </FadeIn>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
