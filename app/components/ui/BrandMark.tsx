"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { site } from "@/lib/content/site";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  href?: string;
  animated?: boolean;
};

const sizeMap = {
  sm: "h-16 w-16 sm:h-20 sm:w-20",
  md: "h-24 w-24 sm:h-32 sm:w-32 md:h-36 md:w-36",
  lg: "h-32 w-32 sm:h-40 sm:w-40",
} as const;

export function BrandMark({
  size = "md",
  href = "/",
  animated = true,
}: BrandMarkProps) {
  const inner = (
    <Image
      src="/logo.png"
      alt={site.name}
      width={500}
      height={500}
      priority={size !== "sm"}
      className={`${sizeMap[size]} object-contain`}
    />
  );

  if (!animated) {
    return href ? (
      <Link href={href} aria-label={site.name} className="inline-block">
        {inner}
      </Link>
    ) : (
      inner
    );
  }

  const wrapper = (
    <motion.span
      initial={{ opacity: 0, y: -6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block"
    >
      {inner}
    </motion.span>
  );

  return href ? (
    <Link href={href} aria-label={site.name} className="inline-block">
      {wrapper}
    </Link>
  ) : (
    wrapper
  );
}
