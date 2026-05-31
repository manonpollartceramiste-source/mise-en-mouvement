import type { ReactNode } from "react";

const labelCls = "text-xs uppercase tracking-wider text-taupe-500";
const inputCls =
  "w-full rounded-xl border border-taupe-300/50 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30";

export function OsField({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
  readOnly,
  min,
  max,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        readOnly={readOnly}
        min={min}
        max={max}
        step={step}
        className={`${inputCls} ${readOnly ? "cursor-not-allowed bg-sand-100 text-taupe-500" : ""}`}
      />
    </label>
  );
}

export function OsTextarea({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className={inputCls}
      />
    </label>
  );
}

export function OsSelect({
  label,
  name,
  defaultValue,
  options,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={inputCls}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OsSubmitButton({
  children = "Enregistrer →",
}: {
  children?: ReactNode;
}) {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-all hover:bg-taupe-800"
    >
      {children}
    </button>
  );
}

export function OsFlash({
  saved,
  error,
}: {
  saved?: string;
  error?: string;
}) {
  if (!saved && !error) return null;
  return (
    <div className="mb-6 space-y-2">
      {saved && (
        <p className="rounded-2xl border border-emerald-300/60 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {saved}
        </p>
      )}
      {error && (
        <p className="rounded-2xl border border-red-300/60 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
