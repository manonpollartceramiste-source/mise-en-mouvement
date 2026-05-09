import Link from "next/link";
import { Fragment } from "react";
import { Container } from "@/app/components/ui/Container";
import { nav } from "@/lib/content/site";
import { loadImages } from "@/lib/content/images.server";
import { getLogoSrc } from "@/lib/content/images";
import { loadLegal } from "@/lib/content/legal.server";
import { loadTexts } from "@/lib/content/texts.server";

const footerTagline =
  "Coaching sportif premium, réathlétisation, pilates.";

const allLinks = [{ href: "/", label: "Accueil" }, ...nav];

export async function Footer() {
  const [images, legal, texts] = await Promise.all([
    loadImages(),
    loadLegal(),
    loadTexts(),
  ]);
  const logoSrc = getLogoSrc(images);
  const year = new Date().getFullYear();
  const email = legal.contactEmail;
  const siteName = texts.siteName;
  return (
    <footer className="mt-auto border-t border-taupe-300/30 bg-sand-100/50">
      <Container className="py-8">
        <div className="grid gap-8 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10">
          {/* Zone gauche — identité */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label={siteName}
              className="group flex shrink-0 items-center gap-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt=""
                className="w-10 h-auto shrink-0 object-contain transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
              />
              <span className="flex flex-col leading-tight">
                <span className="font-serif text-base text-ink-900">
                  {siteName}
                </span>
                <span className="text-xs text-taupe-600">
                  {footerTagline}
                </span>
              </span>
            </Link>
          </div>

          {/* Zone centre — navigation horizontale */}
          <nav className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-taupe-700 md:justify-center">
            {allLinks.map((item, i) => (
              <Fragment key={item.href}>
                {i > 0 && (
                  <span aria-hidden className="text-taupe-400">
                    ·
                  </span>
                )}
                <Link
                  href={item.href}
                  className="px-1 transition-colors hover:text-ink-900"
                >
                  {item.label}
                </Link>
              </Fragment>
            ))}
          </nav>

          {/* Zone droite — contact + CTA */}
          <div className="flex items-center gap-4 md:justify-end">
            <a
              href={`mailto:${email}`}
              className="hidden text-sm text-taupe-700 transition-colors hover:text-ink-900 lg:inline"
            >
              {email}
            </a>
            <Link
              href="/reservation"
              className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-4 py-2 text-sm font-medium text-sand-50 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:bg-taupe-800"
            >
              Réserver
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* Ligne du bas */}
        <div className="mt-6 flex flex-col gap-2 border-t border-taupe-300/30 pt-4 text-xs text-taupe-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} {siteName}</p>
          <div className="flex gap-5">
            <Link
              href="/mentions-legales"
              className="transition-colors hover:text-ink-900"
            >
              Mentions légales
            </Link>
            <Link
              href="/confidentialite"
              className="transition-colors hover:text-ink-900"
            >
              Confidentialité
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
