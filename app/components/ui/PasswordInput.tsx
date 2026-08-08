"use client";

import { useState } from "react";

interface PasswordInputProps {
  id: string;
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  minLength,
  value,
  onChange,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        className="w-full rounded-full border border-taupe-300/50 bg-sand-50 px-5 py-3 pr-12 text-base text-ink-900 placeholder:text-taupe-400 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30"
      />
      <button
        type="button"
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
        onClick={() => setShow((v) => !v)}
        className="absolute inset-y-0 right-4 flex items-center text-taupe-400 hover:text-taupe-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-taupe-500/50 focus-visible:rounded"
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
