"use client";

import { useState, useCallback } from "react";
import { makeLineItem, computeTotals, fmtEur } from "@/lib/billing/types";
import type { LineItem, Prestation } from "@/lib/billing/types";

type Props = {
  mode: "quote" | "invoice";
  defaultValues?: {
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    client_address?: string;
    title?: string;
    description?: string;
    line_items?: LineItem[];
    discount_pct?: number;
    discount_amount?: number;
    notes?: string;
    conditions?: string;
    validity_days?: number;
    payment_method?: string;
    legal_mentions?: string;
    due_at?: string;
    quote_id?: string;
  };
  action: (formData: FormData) => void | Promise<void>;
  editId?: string;
  submitLabel?: string;
  prestations?: Prestation[];
};

export function BillingForm({ mode, defaultValues = {}, action, editId, submitLabel, prestations = [] }: Props) {
  const [items, setItems] = useState<LineItem[]>(
    defaultValues.line_items ?? [makeLineItem()],
  );
  const [discountPct, setDiscountPct] = useState(defaultValues.discount_pct ?? 0);
  const [discountAmount, setDiscountAmount] = useState(defaultValues.discount_amount ?? 0);
  const [validityDays, setValidityDays] = useState(defaultValues.validity_days ?? 30);
  const [pending, setPending] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [librarySearch, setLibrarySearch] = useState("");
  const [saveToBib, setSaveToBib] = useState<Set<string>>(new Set());

  const { subtotal_ht, total_tva, total_ttc } = computeTotals(items, discountPct, discountAmount);

  const activePrestations = prestations.filter((p) => p.is_active);
  const filteredPrestations = activePrestations.filter((p) =>
    p.name.toLowerCase().includes(librarySearch.toLowerCase()) ||
    (p.category ?? "").toLowerCase().includes(librarySearch.toLowerCase()),
  );

  const updateItem = useCallback(
    (idx: number, field: keyof LineItem, raw: string | number) => {
      setItems((prev) => {
        const next = [...prev];
        const item = { ...next[idx] };
        if (field === "quantity" || field === "unit_price" || field === "tva_pct") {
          (item as Record<string, unknown>)[field] = Number(raw);
        } else {
          (item as Record<string, unknown>)[field] = raw;
        }
        item.total_ht = item.quantity * item.unit_price;
        item.total_ttc = item.total_ht * (1 + item.tva_pct / 100);
        next[idx] = item;
        return next;
      });
    },
    [],
  );

  const addItem = () => setItems((p) => [...p, makeLineItem()]);
  const removeItem = (idx: number) =>
    setItems((p) => p.filter((_, i) => i !== idx));

  const addFromLibrary = (prestation: Prestation) => {
    const newItem = makeLineItem();
    newItem.name = prestation.name;
    newItem.description = prestation.description ?? "";
    newItem.unit_price = Number(prestation.unit_price);
    newItem.tva_pct = Number(prestation.tva_pct);
    newItem.quantity = 1;
    newItem.total_ht = newItem.unit_price;
    newItem.total_ttc = newItem.total_ht * (1 + newItem.tva_pct / 100);
    setItems((p) => [...p, newItem]);
    setShowLibrary(false);
    setLibrarySearch("");
  };

  const toggleSaveToBib = (itemId: string) => {
    setSaveToBib((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  async function handleSubmit(formData: FormData) {
    setPending(true);
    formData.set("line_items", JSON.stringify(items));
    formData.set("discount_pct", String(discountPct));
    formData.set("discount_amount", String(discountAmount));
    formData.set("validity_days", String(validityDays));
    const toSave = items.filter((item) => saveToBib.has(item.id));
    if (toSave.length > 0) {
      formData.set("save_to_library", JSON.stringify(toSave.map((item) => ({
        name: item.name,
        description: item.description,
        unit_price: item.unit_price,
        tva_pct: item.tva_pct,
      }))));
    }
    await action(formData);
  }

  return (
    <form action={handleSubmit} className="space-y-8">
      {editId && <input type="hidden" name="id" value={editId} />}
      {defaultValues.quote_id && (
        <input type="hidden" name="quote_id" value={defaultValues.quote_id} />
      )}

      {/* Client */}
      <section className="rounded-2xl border border-taupe-300/40 bg-white p-6">
        <h3 className="mb-5 font-serif text-xl text-ink-900">Informations client</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom / entreprise *" name="client_name" defaultValue={defaultValues.client_name} required />
          <Field label="Email" name="client_email" type="email" defaultValue={defaultValues.client_email} />
          <Field label="Téléphone" name="client_phone" defaultValue={defaultValues.client_phone} />
          <Field label="Adresse" name="client_address" defaultValue={defaultValues.client_address} />
        </div>
      </section>

      {/* Titre + description (devis uniquement) */}
      {mode === "quote" && (
        <section className="rounded-2xl border border-taupe-300/40 bg-white p-6">
          <h3 className="mb-5 font-serif text-xl text-ink-900">Objet du devis</h3>
          <div className="space-y-4">
            <Field label="Titre du devis *" name="title" defaultValue={defaultValues.title} required />
            <Textarea label="Description courte" name="description" defaultValue={defaultValues.description} rows={3} />
          </div>
        </section>
      )}

      {/* Lignes de prestation */}
      <section className="rounded-2xl border border-taupe-300/40 bg-white p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-xl text-ink-900">Prestations</h3>
          <div className="flex items-center gap-2">
            {activePrestations.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLibrary((v) => !v)}
                  className="rounded-xl border border-taupe-400/60 bg-sand-50 px-4 py-2 text-sm font-medium text-taupe-700 transition-colors hover:bg-sand-100"
                >
                  📚 Bibliothèque
                </button>
                {showLibrary && (
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-72 rounded-2xl border border-taupe-300/40 bg-white shadow-lg">
                    <div className="border-b border-taupe-300/30 p-3">
                      <input
                        type="text"
                        value={librarySearch}
                        onChange={(e) => setLibrarySearch(e.target.value)}
                        placeholder="Rechercher…"
                        className="w-full rounded-xl border border-taupe-300/50 bg-sand-50 px-3 py-2 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      {filteredPrestations.length === 0 ? (
                        <p className="py-4 text-center text-xs text-taupe-400">Aucun résultat</p>
                      ) : (
                        filteredPrestations.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => addFromLibrary(p)}
                            className="w-full rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-sand-50"
                          >
                            <p className="text-sm font-medium text-ink-900">{p.name}</p>
                            <p className="text-xs text-taupe-500">
                              {fmtEur(p.unit_price)} HT
                              {Number(p.tva_pct) > 0 && ` · TVA ${p.tva_pct}%`}
                              {p.category && ` · ${p.category}`}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                    <div className="border-t border-taupe-300/30 p-2">
                      <a
                        href="/os/coach/prestations"
                        className="block rounded-xl px-3 py-2 text-center text-xs text-taupe-500 transition-colors hover:bg-sand-50"
                      >
                        Gérer la bibliothèque →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={addItem}
              className="rounded-xl border border-taupe-300/50 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:bg-sand-100"
            >
              + Ajouter une ligne
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="rounded-xl bg-sand-50 p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Nom de la prestation *"
                  value={item.name}
                  onChange={(e) => updateItem(idx, "name", e.target.value)}
                  className="col-span-2 rounded-xl border border-taupe-300/50 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Description (optionnel)"
                  value={item.description}
                  onChange={(e) => updateItem(idx, "description", e.target.value)}
                  className="col-span-2 rounded-xl border border-taupe-300/50 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumberField
                  label="Quantité"
                  value={item.quantity}
                  onChange={(v) => updateItem(idx, "quantity", v)}
                  min={0}
                  step={1}
                />
                <NumberField
                  label="Prix unitaire (€)"
                  value={item.unit_price}
                  onChange={(v) => updateItem(idx, "unit_price", v)}
                  min={0}
                  step={0.01}
                />
                <NumberField
                  label="TVA (%)"
                  value={item.tva_pct}
                  onChange={(v) => updateItem(idx, "tva_pct", v)}
                  min={0}
                  max={100}
                  step={0.1}
                />
                <div className="flex flex-col">
                  <span className="mb-1.5 text-xs font-medium text-taupe-600">Total HT</span>
                  <span className="flex h-10 items-center rounded-xl border border-taupe-300/30 bg-sand-100 px-4 text-sm font-medium text-ink-900">
                    {fmtEur(item.total_ht)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-taupe-500">
                  <input
                    type="checkbox"
                    checked={saveToBib.has(item.id)}
                    onChange={() => toggleSaveToBib(item.id)}
                    className="rounded border-taupe-300"
                  />
                  Sauvegarder dans la bibliothèque
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-xs text-taupe-500 hover:text-red-600"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Remise */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Remise (%)"
            value={discountPct}
            onChange={setDiscountPct}
            min={0}
            max={100}
            step={0.1}
          />
          <NumberField
            label="Remise montant (€)"
            value={discountAmount}
            onChange={setDiscountAmount}
            min={0}
            step={0.01}
          />
        </div>

        {/* Totaux */}
        <div className="mt-6 rounded-xl bg-ink-900 p-5 text-sand-50">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sand-300">Total HT</span>
              <span className="font-medium">{fmtEur(subtotal_ht)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sand-300">TVA</span>
              <span className="font-medium">{fmtEur(total_tva)}</span>
            </div>
            <div className="mt-3 flex justify-between border-t border-sand-50/20 pt-3">
              <span className="font-semibold tracking-wide">Total TTC</span>
              <span className="text-lg font-bold">{fmtEur(total_ttc)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Champs spécifiques */}
      <section className="rounded-2xl border border-taupe-300/40 bg-white p-6">
        <h3 className="mb-5 font-serif text-xl text-ink-900">
          {mode === "quote" ? "Conditions & validité" : "Paiement & mentions"}
        </h3>
        <div className="space-y-4">
          {mode === "quote" && (
            <>
              <NumberField
                label="Validité (jours)"
                value={validityDays}
                onChange={setValidityDays}
                min={1}
                max={365}
                step={1}
              />
              <Textarea
                label="Conditions"
                name="conditions"
                defaultValue={defaultValues.conditions}
                rows={3}
                placeholder="Ex : Devis valable 30 jours, acompte de 30% à la commande…"
              />
            </>
          )}
          {mode === "invoice" && (
            <>
              <Field
                label="Échéance"
                name="due_at"
                type="date"
                defaultValue={defaultValues.due_at ?? addDays30()}
              />
              <Field
                label="Mode de paiement"
                name="payment_method"
                defaultValue={defaultValues.payment_method}
                placeholder="Ex : Virement, CB, Chèque…"
              />
              <Textarea
                label="Mentions légales"
                name="legal_mentions"
                defaultValue={defaultValues.legal_mentions}
                rows={3}
                placeholder="TVA non applicable, art. 293B du CGI…"
              />
            </>
          )}
          <Textarea
            label="Notes internes"
            name="notes"
            defaultValue={defaultValues.notes}
            rows={2}
            placeholder="Notes visibles uniquement par vous…"
          />
        </div>
      </section>

      <div className="flex justify-end gap-3">
        <a
          href={mode === "quote" ? "/os/coach/devis" : "/os/coach/factures"}
          className="rounded-xl border border-taupe-300/50 px-5 py-2.5 text-sm font-medium text-taupe-700 transition-colors hover:bg-sand-100"
        >
          Annuler
        </a>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-ink-900 px-6 py-2.5 text-sm font-medium text-sand-50 transition-colors hover:bg-taupe-700 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : (submitLabel ?? "Enregistrer")}
        </button>
      </div>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-taupe-600">{label}</label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
      />
    </div>
  );
}

function Textarea({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 4,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-taupe-600">{label}</label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={rows}
        className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 placeholder-taupe-400 focus:border-taupe-500 focus:outline-none"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  name,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-taupe-600">{label}</label>
      <input
        type="number"
        name={name}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="rounded-xl border border-taupe-300/50 bg-sand-50 px-4 py-2.5 text-sm text-ink-900 focus:border-taupe-500 focus:outline-none"
      />
    </div>
  );
}

function addDays30(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
