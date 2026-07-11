import type { ReactNode } from "react";

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
    <div className="min-h-full bg-sand-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">Admin</p>
        <h1 className="mt-3 font-serif text-3xl text-ink-900">{title}</h1>
        {intro && (
          <p className="mt-3 max-w-xl text-sm text-taupe-600">{intro}</p>
        )}
        <div className="mt-10">{children}</div>
      </div>
    </div>
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
