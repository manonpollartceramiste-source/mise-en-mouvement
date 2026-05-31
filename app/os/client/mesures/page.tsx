import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import type { Measure } from "@/lib/os/types";
import {
  EvolutionCharts,
  type ChartMeasure,
} from "../evolution/EvolutionCharts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mes mesures · Client",
  robots: { index: false, follow: false },
};

const fmtDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const fmtShort = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function ClientMesuresPage() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("measures")
    .select("*")
    .eq("client_id", profile.id)
    .order("measured_at", { ascending: false });

  const measures = (data ?? []) as Measure[];
  const latest = measures[0] ?? null;

  const chartData: ChartMeasure[] = measures.map((m) => ({
    date: m.measured_at,
    weight_kg: m.weight_kg,
    fat_pct: m.fat_pct,
    muscle_pct: m.muscle_pct,
  }));

  return (
    <OsShell profile={profile} title="Mes mesures">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">Mes mesures</h2>
        {latest && (
          <p className="mt-1 text-sm text-taupe-500">
            Dernier relevé :{" "}
            {fmtDate.format(new Date(latest.measured_at))}
          </p>
        )}
      </div>

      {measures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-300/60 bg-sand-100/30 p-12 text-center">
          <p className="font-serif text-xl text-ink-900">Aucune mesure</p>
          <p className="mt-2 text-sm text-taupe-500">
            Votre coach enregistrera vos mesures lors des séances.
          </p>
        </div>
      ) : (
        <>
          {/* Dernières mesures — hero cards */}
          {latest && (
            <div className="mb-8">
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
                Dernières valeurs
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  {
                    label: "Poids",
                    value: latest.weight_kg,
                    unit: "kg",
                  },
                  {
                    label: "Masse grasse",
                    value: latest.fat_pct,
                    unit: "%",
                  },
                  {
                    label: "Masse musculaire",
                    value: latest.muscle_pct,
                    unit: "%",
                  },
                  { label: "IMC", value: latest.bmi, unit: "" },
                ]
                  .filter((s) => s.value != null)
                  .map((s) => (
                    <div
                      key={s.label}
                      className="rounded-2xl border border-taupe-300/40 bg-white p-5"
                    >
                      <p className="text-xs uppercase tracking-wider text-taupe-400">
                        {s.label}
                      </p>
                      <p className="mt-2 font-serif text-3xl text-ink-900">
                        {s.value}
                        {s.unit && (
                          <span className="font-sans text-base font-normal text-taupe-400">
                            {" "}
                            {s.unit}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
              </div>

              {/* Mesures secondaires */}
              {(latest.waist_cm ||
                latest.hip_cm ||
                latest.chest_cm ||
                latest.thigh_cm ||
                latest.arm_cm) && (
                <div className="mt-3 flex flex-wrap gap-4 rounded-2xl border border-taupe-300/40 bg-white px-5 py-4">
                  {[
                    { label: "Tour de taille", v: latest.waist_cm, u: "cm" },
                    { label: "Tour de hanches", v: latest.hip_cm, u: "cm" },
                    { label: "Poitrine", v: latest.chest_cm, u: "cm" },
                    { label: "Cuisse", v: latest.thigh_cm, u: "cm" },
                    { label: "Bras", v: latest.arm_cm, u: "cm" },
                  ]
                    .filter((x) => x.v != null)
                    .map((x) => (
                      <div key={x.label}>
                        <p className="text-xs text-taupe-400">{x.label}</p>
                        <p className="mt-0.5 font-medium text-ink-900">
                          {x.v} {x.u}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Graphiques d'évolution */}
          {chartData.length >= 2 && (
            <div className="mb-8">
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
                Évolution
              </p>
              <EvolutionCharts data={chartData} />
            </div>
          )}

          {/* Historique */}
          <div>
            <p className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
              Historique ({measures.length})
            </p>
            <div className="overflow-hidden rounded-2xl border border-taupe-300/40 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-taupe-300/20">
                    <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-taupe-400">
                      Date
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-taupe-400">
                      Poids
                    </th>
                    <th className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-taupe-400 sm:table-cell">
                      MG
                    </th>
                    <th className="hidden px-3 py-3 text-right text-xs font-medium uppercase tracking-wider text-taupe-400 sm:table-cell">
                      MM
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-taupe-400">
                      IMC
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-taupe-300/20">
                  {measures.map((m) => (
                    <tr key={m.id} className="hover:bg-sand-50/50">
                      <td className="px-5 py-3 text-sm text-ink-900">
                        {fmtShort.format(new Date(m.measured_at))}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-taupe-700">
                        {m.weight_kg != null ? `${m.weight_kg} kg` : "—"}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-sm text-taupe-700 sm:table-cell">
                        {m.fat_pct != null ? `${m.fat_pct} %` : "—"}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-sm text-taupe-700 sm:table-cell">
                        {m.muscle_pct != null ? `${m.muscle_pct} %` : "—"}
                      </td>
                      <td className="px-5 py-3 text-right text-sm text-taupe-700">
                        {m.bmi != null ? m.bmi : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </OsShell>
  );
}
