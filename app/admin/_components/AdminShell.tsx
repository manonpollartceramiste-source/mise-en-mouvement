import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "../login/actions";

export function AdminShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-sand-50">
      <header className="border-b border-taupe-300/30 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link
            href="/admin"
            className="text-xs uppercase tracking-[0.25em] text-taupe-500 transition-colors hover:text-ink-900"
          >
            ← Tableau de bord
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-all hover:bg-sand-100"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Admin
        </p>
        <h1 className="mt-3 font-serif text-3xl text-ink-900">{title}</h1>
        {intro && (
          <p className="mt-3 max-w-xl text-sm text-taupe-600">{intro}</p>
        )}
        <div className="mt-10">{children}</div>
      </section>
    </main>
  );
}

export function FlashMessages({
  saved,
  error,
}: {
  saved?: string;
  error?: string;
}) {
  if (!saved && !error) return null;
  return (
    <div className="mb-8 space-y-3">
      {saved && (
        <p className="rounded-2xl border border-emerald-300/60 bg-emerald-50 p-3 text-sm text-emerald-900">
          {saved}
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-red-300/60 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
