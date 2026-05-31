import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { OsShell } from "@/app/os/_components/OsShell";
import type { ClientGoal, GoalStatus } from "@/lib/os/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Mes objectifs · Client",
  robots: { index: false, follow: false },
};

const STATUS_CONFIG: Record<
  GoalStatus,
  { label: string; dot: string; section: string; empty: string }
> = {
  actif: {
    label: "En cours",
    dot: "bg-taupe-600",
    section: "text-taupe-700",
    empty: "Aucun objectif actif pour le moment.",
  },
  atteint: {
    label: "Atteint",
    dot: "bg-emerald-500",
    section: "text-emerald-700",
    empty: "Aucun objectif atteint encore.",
  },
  abandonné: {
    label: "Abandonné",
    dot: "bg-taupe-300",
    section: "text-taupe-400",
    empty: "",
  },
};

export default async function ClientObjectifsPage() {
  const profile = await getOsProfileWithRole("client");
  if (!profile) redirect("/os/login");

  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("client_goals")
    .select("*")
    .eq("client_id", profile.id)
    .order("created_at", { ascending: false });

  const goals = (data ?? []) as ClientGoal[];

  const byStatus = (status: GoalStatus) =>
    goals.filter((g) => g.status === status);

  const actifs = byStatus("actif");
  const atteints = byStatus("atteint");
  const abandonnes = byStatus("abandonné");

  return (
    <OsShell profile={profile} title="Mes objectifs">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-taupe-400">
          Cabinet OS
        </p>
        <h2 className="mt-1 font-serif text-3xl text-ink-900">
          Mes objectifs
        </h2>
        {actifs.length > 0 && (
          <p className="mt-1 text-sm text-taupe-500">
            {actifs.length} objectif{actifs.length > 1 ? "s" : ""} en cours
          </p>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-taupe-300/60 bg-sand-100/30 p-12 text-center">
          <p className="font-serif text-xl text-ink-900">
            Aucun objectif défini
          </p>
          <p className="mt-2 text-sm text-taupe-500">
            Votre coach définira vos objectifs lors de vos échanges.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {actifs.length > 0 && (
            <GoalSection
              title="En cours"
              goals={actifs}
              status="actif"
            />
          )}

          {atteints.length > 0 && (
            <GoalSection
              title="Objectifs atteints"
              goals={atteints}
              status="atteint"
            />
          )}

          {abandonnes.length > 0 && (
            <GoalSection
              title="Abandonnés"
              goals={abandonnes}
              status="abandonné"
            />
          )}
        </div>
      )}
    </OsShell>
  );
}

function GoalSection({
  title,
  goals,
  status,
}: {
  title: string;
  goals: ClientGoal[];
  status: GoalStatus;
}) {
  const cfg = STATUS_CONFIG[status];

  return (
    <section>
      <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-taupe-500">
        {title}
        <span className="ml-2 normal-case tracking-normal text-taupe-400">
          ({goals.length})
        </span>
      </h3>
      <div className="space-y-3">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} cfg={cfg} />
        ))}
      </div>
    </section>
  );
}

function GoalCard({
  goal,
  cfg,
}: {
  goal: ClientGoal;
  cfg: (typeof STATUS_CONFIG)[GoalStatus];
}) {
  return (
    <div
      className={`rounded-2xl border border-taupe-300/40 bg-white p-5 ${
        goal.status === "abandonné" ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${cfg.dot}`}
        />
        <div className="flex-1">
          <p className="font-medium text-ink-900">{goal.title}</p>
          {goal.description && (
            <p className="mt-1 text-sm text-taupe-600">{goal.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-taupe-400">
            {goal.target_date && goal.status === "actif" && (
              <span>
                Objectif :{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(goal.target_date))}
              </span>
            )}
            {goal.achieved_at && goal.status === "atteint" && (
              <span className="text-emerald-600">
                Atteint le{" "}
                {new Intl.DateTimeFormat("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(goal.achieved_at))}
              </span>
            )}
            <span>
              Créé le{" "}
              {new Intl.DateTimeFormat("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(goal.created_at))}
            </span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
            goal.status === "actif"
              ? "bg-taupe-100 text-taupe-700"
              : goal.status === "atteint"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-sand-100 text-taupe-400"
          }`}
        >
          {cfg.label}
        </span>
      </div>
    </div>
  );
}
