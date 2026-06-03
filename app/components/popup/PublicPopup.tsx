"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Popup } from "@/lib/content/popups";
import { FormattedText } from "@/app/components/ui/FormattedText";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const STORAGE_PREFIX = "mem-popup-dismissed:";

function withinWindow(startsAt: string | null, endsAt: string | null, now: number): boolean {
  if (startsAt) {
    const t = Date.parse(startsAt);
    if (!Number.isNaN(t) && t > now) return false;
  }
  if (endsAt) {
    const t = Date.parse(endsAt);
    if (!Number.isNaN(t) && t < now) return false;
  }
  return true;
}

export function PublicPopup() {
  const pathname = usePathname();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    console.log("[Popup] composant monté");
    console.log("[Popup] pathname:", pathname);

    // Ne pas afficher dans admin ou OS
    if (pathname?.startsWith("/admin") || pathname?.startsWith("/os")) {
      console.log("[Popup] ignorée — zone admin/OS, arrêt.");
      return;
    }

    // Scope selon la page
    let page: "home" | "offres" | null = null;
    if (pathname === "/" || pathname === "") {
      page = "home";
    } else if (pathname?.startsWith("/offres")) {
      page = "offres";
    }

    if (!page) {
      console.log("[Popup] ignorée — page non ciblée (popup uniquement sur / et /offres)");
      return;
    }

    void loadPopup(page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function loadPopup(page: "home" | "offres") {
    console.log("[Popup] requête Supabase lancée — active=true, scope in [" + page + ", both]");

    let supabase;
    try {
      supabase = getSupabaseBrowser();
    } catch (err) {
      console.log("[Popup] erreur Supabase", err);
      return;
    }

    const { data, error } = await supabase
      .from("popups")
      .select("id, title, body, cta_label, cta_href, scope, active, starts_at, ends_at")
      .eq("active", true)
      .in("scope", [page, "both"])
      .order("created_at", { ascending: false });

    console.log("[Popup] données récupérées", data);

    if (error) {
      console.log("[Popup] erreur Supabase", error);
      return;
    }

    if (!data || data.length === 0) {
      console.log("[Popup] popup ignorée — raison: aucune ligne active en base pour cette page");
      return;
    }

    const now = Date.now();
    const row = data.find((r) => withinWindow(r.starts_at, r.ends_at, now));

    if (!row) {
      console.log("[Popup] popup ignorée — raison: toutes les popups filtrées par starts_at / ends_at");
      return;
    }

    const chosen: Popup = {
      id: row.id,
      title: row.title,
      body: row.body,
      ctaLabel: row.cta_label,
      ctaHref: row.cta_href,
      scope: row.scope,
      active: row.active,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
    };

    console.log("[Popup] popup retenue", chosen);

    // Vérifier sessionStorage
    const key = `${STORAGE_PREFIX}${chosen.id}`;
    try {
      if (sessionStorage.getItem(key) !== null) {
        console.log("[Popup] popup ignorée — raison: déjà fermée (sessionStorage). Pour forcer: sessionStorage.removeItem('" + key + "')");
        return;
      }
    } catch {
      // sessionStorage inaccessible — on affiche quand même
    }

    setPopup(chosen);
    setVisible(true);
    console.log("[Popup] popup affichée ✓");
  }

  const dismiss = useCallback(() => {
    if (!popup) return;
    const key = `${STORAGE_PREFIX}${popup.id}`;
    setVisible(false);
    try {
      sessionStorage.setItem(key, "1");
    } catch { /* ignore */ }
  }, [popup]);

  // ESC pour fermer
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  // Bloquer le scroll body
  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!popup) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-[3px]"
            onClick={dismiss}
            aria-hidden="true"
          />

          {/* Carte */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={popup.title}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-3xl border border-taupe-200/60 bg-sand-50 px-8 py-9 shadow-[0_40px_100px_-20px_rgba(15,14,12,0.45)]"
          >
            {/* × */}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fermer la popup"
              className="absolute right-5 top-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-taupe-400 transition-colors hover:bg-sand-100 hover:text-ink-900"
            >
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </button>

            {/* Titre */}
            <p className="pr-6 font-serif text-2xl leading-snug tracking-tight text-ink-900">
              {popup.title}
            </p>

            {/* Corps */}
            <FormattedText
              text={popup.body}
              topGap="mt-4"
              className="text-base leading-relaxed text-taupe-700"
            />

            {/* Actions */}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {popup.ctaLabel && popup.ctaHref && (
                <a
                  href={popup.ctaHref}
                  onClick={dismiss}
                  className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-all duration-300 hover:-translate-y-0.5 hover:bg-taupe-800"
                >
                  {popup.ctaLabel}
                  <span aria-hidden="true">→</span>
                </a>
              )}
              <button
                type="button"
                onClick={dismiss}
                className="text-sm text-taupe-500 underline-offset-2 transition-colors hover:text-ink-900 hover:underline"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
