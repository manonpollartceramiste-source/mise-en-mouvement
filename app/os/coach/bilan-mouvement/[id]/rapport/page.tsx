import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getOsProfileWithRole,
  getAssessmentById,
} from "@/lib/supabase/os-server";
import RapportViewerClient from "./RapportViewerClient";

export const dynamic = "force-dynamic";
type Params = Promise<{ id: string }>;

export default async function RapportPage({ params }: { params: Params }) {
  const { id } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const coachProfile = await getOsProfileWithRole("coach");
  if (!coachProfile) redirect("/os/login");

  // ── Récupération du bilan ─────────────────────────────────────────────────
  const assessment = await getAssessmentById(id);

  if (!assessment) {
    return <NotFound id={id} reason="Ce bilan n'existe pas ou a été supprimé." />;
  }

  const isAdmin = coachProfile.roles?.includes("admin") ?? false;
  if (!isAdmin && assessment.coach_id !== coachProfile.id) {
    return <NotFound id={id} reason="Vous n'avez pas accès à ce bilan." />;
  }

  // ── OK — render viewer ────────────────────────────────────────────────────
  return <RapportViewerClient id={id} />;
}

// ─── Composant d'erreur ───────────────────────────────────────────────────────

function NotFound({ id, reason }: { id: string; reason: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#120f0b",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
      padding: "32px",
      textAlign: "center",
    }}>
      <div style={{
        width: 48, height: 48,
        borderRadius: 4,
        background: "rgba(184,154,96,0.12)",
        border: "1px solid rgba(184,154,96,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 24,
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M11 4v8M11 16v.5" stroke="#b89a60" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#e8dece", marginBottom: 10 }}>
        Bilan introuvable
      </h1>
      <p style={{ fontSize: 14, color: "#6e5f4a", maxWidth: 360, lineHeight: 1.6, marginBottom: 8 }}>
        {reason}
      </p>
      <p style={{ fontSize: 11, color: "#3a3028", marginBottom: 32, fontFamily: "monospace" }}>
        ID : {id}
      </p>

      <Link
        href="/os/coach/bilan-mouvement"
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "transparent",
          border: "1px solid #3a3228",
          color: "#8c7e6e",
          borderRadius: 999,
          padding: "0 20px",
          height: 38,
          fontSize: 13,
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← Retour aux bilans
      </Link>
    </div>
  );
}
