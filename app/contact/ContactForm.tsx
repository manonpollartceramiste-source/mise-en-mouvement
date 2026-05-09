"use client";

import { useActionState } from "react";
import { motion } from "framer-motion";
import { submitContact, type ContactState } from "./actions";

const initialState: ContactState = { status: "idle" };

type Props = {
  prefilledSubject?: string;
};

export function ContactForm({ prefilledSubject }: Props) {
  const [state, action, pending] = useActionState(submitContact, initialState);

  return (
    <form action={action} className="space-y-6">
      <Field
        name="name"
        label="Nom complet"
        required
        error={state.errors?.name}
      />
      <Field
        name="email"
        type="email"
        label="Email"
        required
        error={state.errors?.email}
      />
      <Field name="phone" label="Téléphone (optionnel)" />
      <Field
        name="subject"
        label="Sujet"
        defaultValue={prefilledSubject ?? ""}
      />
      <div className="space-y-2">
        <label
          htmlFor="message"
          className="text-xs uppercase tracking-wider text-taupe-500"
        >
          Votre message
        </label>
        <textarea
          id="message"
          name="message"
          rows={6}
          required
          className="w-full rounded-2xl border border-taupe-300/40 bg-sand-50 px-4 py-3 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
        />
        {state.errors?.message && (
          <p className="text-xs text-red-700">{state.errors.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-6 py-3 text-sm font-medium text-sand-50 transition-all duration-300 hover:bg-taupe-800 disabled:opacity-50"
      >
        {pending ? "Envoi…" : "Envoyer le message"}
        <span aria-hidden>→</span>
      </button>

      {state.status === "success" && state.message && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-taupe-300/40 bg-sand-100 p-4 text-sm text-ink-900"
        >
          {state.message}
        </motion.p>
      )}
      {state.status === "error" && state.message && !state.errors && (
        <p className="rounded-2xl border border-red-300/60 bg-red-50 p-4 text-sm text-red-800">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  error,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={name}
        className="text-xs uppercase tracking-wider text-taupe-500"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-full border border-taupe-300/40 bg-sand-50 px-5 py-3 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
      />
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
