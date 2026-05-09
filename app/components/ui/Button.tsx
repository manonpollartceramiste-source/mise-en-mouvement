import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-wide transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-taupe-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 will-change-transform";

const variants: Record<Variant, string> = {
  primary:
    "bg-taupe-700 text-sand-50 shadow-[0_8px_24px_-12px_rgba(15,14,12,0.45)] hover:-translate-y-0.5 hover:bg-taupe-800 hover:shadow-[0_18px_36px_-18px_rgba(15,14,12,0.6)] active:translate-y-0 active:scale-[0.99]",
  secondary:
    "bg-sand-100 text-ink-900 border border-taupe-300/40 hover:-translate-y-0.5 hover:bg-sand-200 hover:border-taupe-400/60 hover:shadow-[0_14px_28px_-18px_rgba(78,70,59,0.45)] active:translate-y-0",
  ghost:
    "text-ink-900 border border-transparent hover:bg-sand-100 hover:border-taupe-300/40",
};

type SharedProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type AnchorProps = SharedProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, keyof SharedProps | "href">;

type NativeButtonProps = SharedProps & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, keyof SharedProps>;

export type ButtonProps = AnchorProps | NativeButtonProps;

function classes(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

export function Button(props: ButtonProps) {
  if ("href" in props && props.href !== undefined) {
    const { variant, className, children, href, ...rest } = props;
    return (
      <Link href={href} className={classes(variant, className)} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant, className, children, ...rest } = props;
  return (
    <button className={classes(variant, className)} {...rest}>
      {children}
    </button>
  );
}
