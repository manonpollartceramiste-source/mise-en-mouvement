"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useState, useSyncExternalStore } from "react";
import type { Popup } from "@/lib/content/popups";
import { FormattedText } from "@/app/components/ui/FormattedText";

const STORAGE_PREFIX = "mem-popup-dismissed:";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  function onStorage() {
    cb();
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
function notify() {
  for (const l of listeners) l();
}

export function PopupBanner({ popup }: { popup: Popup }) {
  const key = `${STORAGE_PREFIX}${popup.id}`;
  const getSnapshot = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(key) !== null,
    [key],
  );
  const dismissed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => true, // SSR : caché
  );
  const [closing, setClosing] = useState(false);
  const visible = !dismissed && !closing;

  function dismiss() {
    setClosing(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, "1");
      notify();
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="dialog"
          aria-label={popup.title}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-4 bottom-4 z-50 rounded-3xl border border-taupe-300/40 bg-sand-50/95 p-7 shadow-[0_30px_90px_-25px_rgba(15,14,12,0.4)] backdrop-blur-sm sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:p-9"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-taupe-500 transition-colors hover:bg-sand-100 hover:text-ink-900"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
          <p className="pr-8 font-serif text-2xl leading-tight text-ink-900">
            {popup.title}
          </p>
          <FormattedText
            text={popup.body}
            topGap="mt-4"
            className="text-base leading-relaxed text-taupe-700"
          />
          {popup.ctaLabel && popup.ctaHref && (
            <a
              href={popup.ctaHref}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-all duration-300 hover:-translate-y-0.5 hover:bg-taupe-800"
            >
              {popup.ctaLabel}
              <span aria-hidden>→</span>
            </a>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
