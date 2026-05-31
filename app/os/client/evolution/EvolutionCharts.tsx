"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface ChartMeasure {
  date: string;
  weight_kg: number | null;
  fat_pct: number | null;
  muscle_pct: number | null;
}

const fmtTick = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
});

function MiniChart({
  data,
  dataKey,
  color,
  unit,
  label,
}: {
  data: ChartMeasure[];
  dataKey: keyof ChartMeasure;
  color: string;
  unit: string;
  label: string;
}) {
  const filtered = data.filter((d) => d[dataKey] != null);
  if (filtered.length < 2) return null;

  return (
    <div className="rounded-2xl border border-taupe-300/40 bg-white p-5">
      <p className="mb-4 text-xs uppercase tracking-wider text-taupe-500">
        {label}
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart
          data={filtered}
          margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e2da" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => fmtTick.format(new Date(v))}
            tick={{ fontSize: 11, fill: "#9a8f82" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9a8f82" }}
            tickLine={false}
            axisLine={false}
            unit={unit}
          />
          <Tooltip
            formatter={(v) => [`${v}${unit}`, label]}
            labelFormatter={(l) => fmtTick.format(new Date(l))}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #d9d0c7",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EvolutionCharts({ data }: { data: ChartMeasure[] }) {
  const chronological = [...data].reverse();

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MiniChart
        data={chronological}
        dataKey="weight_kg"
        color="#6b5e52"
        unit=" kg"
        label="Poids"
      />
      <MiniChart
        data={chronological}
        dataKey="fat_pct"
        color="#c4956a"
        unit=" %"
        label="Masse grasse"
      />
      <MiniChart
        data={chronological}
        dataKey="muscle_pct"
        color="#5a8a6e"
        unit=" %"
        label="Masse musculaire"
      />
    </div>
  );
}
