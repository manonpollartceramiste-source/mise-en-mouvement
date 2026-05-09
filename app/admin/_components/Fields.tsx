import type { ReactNode } from "react";

const labelCls = "text-xs uppercase tracking-wider text-taupe-500";
const inputCls =
  "w-full rounded-xl border border-taupe-300/50 bg-white px-3 py-2 text-sm text-ink-900 focus:border-taupe-600 focus:outline-none focus:ring-2 focus:ring-taupe-500/30";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
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
        className={inputCls}
      />
    </label>
  );
}

export function Textarea({
  label,
  name,
  defaultValue,
  rows = 3,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        placeholder={placeholder}
        className={inputCls}
      />
    </label>
  );
}

export function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <select name={name} defaultValue={defaultValue} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Checkbox({
  label,
  name,
  defaultChecked = false,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-900">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-taupe-400"
      />
      {label}
    </label>
  );
}

export function FileField({
  label,
  name,
  accept = "image/*",
  hint,
}: {
  label: string;
  name: string;
  accept?: string;
  hint?: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={labelCls}>{label}</span>
      <input
        type="file"
        name={name}
        accept={accept}
        className="block w-full text-sm text-ink-900 file:mr-3 file:rounded-full file:border-0 file:bg-taupe-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sand-50 hover:file:bg-taupe-800"
      />
      {hint && <p className="text-xs text-taupe-500">{hint}</p>}
    </label>
  );
}

export function SubmitButton({ children = "Enregistrer →" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex items-center gap-2 rounded-full bg-taupe-700 px-5 py-2.5 text-sm font-medium text-sand-50 transition-all hover:bg-taupe-800"
    >
      {children}
    </button>
  );
}
