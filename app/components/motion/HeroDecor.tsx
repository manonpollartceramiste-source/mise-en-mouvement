"use client";

import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function HeroDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* Blob taupe — angle haut droit */}
      <motion.span
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: [0, 18, 0],
          y: [0, -10, 0],
        }}
        transition={{
          opacity: { duration: 1.4, ease },
          scale: { duration: 1.4, ease },
          x: { duration: 14, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 14, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(168,154,137,0.55),rgba(168,154,137,0)_70%)] blur-3xl"
      />

      {/* Blob sable — bas gauche */}
      <motion.span
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          x: [0, -12, 0],
          y: [0, 10, 0],
        }}
        transition={{
          opacity: { duration: 1.6, delay: 0.2, ease },
          scale: { duration: 1.6, delay: 0.2, ease },
          x: { duration: 18, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 18, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -bottom-40 -left-24 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle_at_60%_40%,rgba(217,205,182,0.7),rgba(217,205,182,0)_70%)] blur-3xl"
      />

      {/* Arc fin — suggère le mouvement */}
      <motion.svg
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, delay: 0.4, ease }}
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
        className="absolute inset-x-0 top-0 h-full w-full"
      >
        <motion.path
          d="M -50 420 Q 300 280 600 360 T 1250 300"
          fill="none"
          stroke="rgba(110,99,83,0.25)"
          strokeWidth="1.2"
          strokeDasharray="1600"
          initial={{ strokeDashoffset: 1600 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2.4, delay: 0.5, ease }}
        />
        <motion.path
          d="M -50 480 Q 320 360 640 420 T 1250 380"
          fill="none"
          stroke="rgba(110,99,83,0.15)"
          strokeWidth="1"
          strokeDasharray="1600"
          initial={{ strokeDashoffset: 1600 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2.6, delay: 0.7, ease }}
        />
      </motion.svg>

      {/* Petits points organiques (rythme visuel) */}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, -8, 0] }}
        transition={{
          opacity: { duration: 1.2, delay: 0.9, ease },
          y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute right-[18%] top-[28%] h-2 w-2 rounded-full bg-taupe-500/70"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { duration: 1.2, delay: 1.1, ease },
          y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute left-[22%] top-[58%] h-1.5 w-1.5 rounded-full bg-taupe-400/70"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, -5, 0] }}
        transition={{
          opacity: { duration: 1.2, delay: 1.3, ease },
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute right-[34%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-taupe-300/80"
      />
    </div>
  );
}
