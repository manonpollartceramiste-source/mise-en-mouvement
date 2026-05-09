"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "header" | "article";
};

export function FadeIn({
  children,
  delay = 0,
  className = "",
  as = "div",
}: FadeInProps) {
  const MotionTag = motion[as];
  return (
    <MotionTag
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
