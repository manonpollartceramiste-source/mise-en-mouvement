import Link from "next/link";
import { Container } from "@/app/components/ui/Container";
import { Button } from "@/app/components/ui/Button";
import { nav } from "@/lib/content/site";
import { loadImages } from "@/lib/content/images.server";
import { getLogoSrc } from "@/lib/content/images";
import { loadTexts } from "@/lib/content/texts.server";

export async function Header() {
  const [images, texts] = await Promise.all([loadImages(), loadTexts()]);
  const logoSrc = getLogoSrc(images);
  const siteName = texts.siteName;

  return (
    <header className="sticky top-0 z-40 border-b border-taupe-300/30 bg-sand-50/85 backdrop-blur-md">
      <Container className="flex h-24 items-center justify-between gap-6 md:h-32">
        <Link
          href="/"
          aria-label={siteName}
          className="group flex shrink-0 items-center gap-3"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoSrc}
            alt=""
            className="w-20 h-auto shrink-0 object-contain transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] md:w-[110px]"
          />
          <span className="font-serif text-base leading-tight tracking-tight text-ink-900">
            {siteName}
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-taupe-600 transition-colors duration-300 hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          href="/reservation"
          variant="primary"
          className="hidden md:inline-flex"
        >
          Réserver
        </Button>
      </Container>
    </header>
  );
}
