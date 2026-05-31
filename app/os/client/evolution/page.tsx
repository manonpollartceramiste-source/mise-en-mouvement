import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import type { Measure } from "@/lib/os/types";
import { EvolutionCharts } from "./EvolutionCharts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mon évolution",
  robots: { index: false, follow: false },
};

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmt(v: number | null | undefined, unit = "") {
  if (v == null) return "—";
  return `${v}${unit}`;
}

export default async function ClientEvolutionPage() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("measures")
    .select("*")
    .eq("client_id", profile.id)
    .order("measured_at", { ascending: false });

  const measures = (data ?? []) as Measure[];

  return (
    <OsShell profile={profile} title="Mon évolution">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-500">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-2xl text-ink-900">
          Mon évolution
        </h2>
      </div>

      {measures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-400/60 bg-sand-100/30 p-12 text-center">
          <p className="font-serif text-xl text-ink-900">
            Aucune mesure enregistrée
          </p>
          <p className="mt-2 text-sm text-taupe-600">
            Votre coach ajoutera vos mesures au fil des séances.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Graphiques */}
          <EvolutionCharts
            data={measures.map((m) => ({
              date: m.measured_at,
              weight_kg: m.weight_kg,
              fat_pct: m.fat_pct,
              muscle_pct: m.muscle_pct,
            }))}
          />

          {/* Dernière mesure mise en avant */}
          {measures[0] && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Poids", value: fmt(measures[0].weight_kg, " kg") },
                { label: "Masse grasse", value: fmt(measures[0].fat_pct, " %") },
                { label: "Masse musculaire", value: fmt(measures[0].muscle_pct, " %") },
                { label: "IMC", value: fmt(measures[0].bmi) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-taupe-300/40 bg-white p-5"
                >
                  <p className="text-xs uppercase tracking-wider text-taupe-500">
                    {s.label}
                  </p>
                  <p className="mt-2 font-serif text-3xl text-ink-900">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-taupe-400">Dernier relevé</p>
                </div>
              ))}
            </div>
          )}

          {/* Tableau historique */}
          <div className="overflow-x-auto rounded-2xl border border-taupe-300/40 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-taupe-300/30">
                  {[
                    "Date",
                    "Poids",
                    "Grasse",
                    "Muscle",
                    "Eau",
                    "IMC",
                    "MétaBase",
                    "Notes",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs uppercase tracking-wider text-taupe-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-taupe-300/20">
                {measures.map((m) => (
                  <tr key={m.id} className="hover:bg-sand-50">
                    <td className="px-4 py-3 font-medium text-taupe-700">
                      {fmtDate.format(new Date(m.measured_at))}
                    </td>
                    <td className="px-4 py-3">
                      {fmt(m.weight_kg, " kg")}
                    </td>
                    <td className="px-4 py-3">
                      {fmt(m.fat_pct, " %")}
                    </td>
                    <td className="px-4 py-3">
                      {fmt(m.muscle_pct, " %")}
                    </td>
                    <td className="px-4 py-3">
                      {fmt(m.water_pct, " %")}
                    </td>
                    <td className="px-4 py-3">{fmt(m.bmi)}</td>
                    <td className="px-4 py-3">
                      {m.bmr_kcal != null ? `${m.bmr_kcal} kcal` : "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-taupe-500">
                      {m.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </OsShell>
  );
}
