"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FaqItem } from "@/lib/content/faq";

type FAQItemProps = {
  item: FaqItem;
  defaultOpen?: boolean;
};

export function FAQItem({ item, defaultOpen = false }: FAQItemProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-taupe-300/40 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 py-6 text-left transition-colors hover:text-taupe-700"
      >
        <span className="font-serif text-lg text-ink-900 sm:text-xl">
          {item.question}
        </span>
        <span
          aria-hidden
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-taupe-400/60 text-taupe-600 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="overflow-hidden"
          >
            <p className="pb-6 pr-14 text-base leading-relaxed text-taupe-700">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
