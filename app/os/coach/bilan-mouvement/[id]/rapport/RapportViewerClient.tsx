"use client";

import { useState } from "react";

export default function RapportViewerClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  // Cache-buster : chaque chargement de la page force un nouveau fetch de l'iframe
  const [bust] = useState(() => Date.now());

  const previewUrl  = `/api/pdf/bilan/${id}?preview=1&v=${bust}`;
  const downloadUrl = `/api/pdf/bilan/${id}`;

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(downloadUrl);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), {
        href:     URL.createObjectURL(blob),
        download: `bilan-mouvement.pdf`,
      });
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={outer}>
        {/* Barre supérieure */}
        <div style={topBar}>
          <button onClick={() => window.history.back()} style={btnGhost}>
            ← Retour
          </button>
          <div style={barCenter}>
            <span style={barDiamond} />
            <span style={barLabel}>Rapport PDF · Bilan Mouvement</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={loading}
            style={{ ...btnGold, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <span style={spinEl} /> : <DownloadIcon />}
            {loading ? "Génération…" : "Télécharger PDF"}
          </button>
        </div>

        {/* Erreur téléchargement */}
        {error && (
          <div style={errorBanner}>
            ⚠ Génération PDF échouée : {error}
          </div>
        )}

        {/* Bandeau de diagnostic — à supprimer une fois page 4 confirmée */}
        <div style={debugBanner}>
          VERSION TEST ROUTE ACTIVE — v{bust}
        </div>

        {/* Aperçu défilant — toutes les pages */}
        <div style={scroll}>
          <div style={a4Wrap}>
            {/* Une seule iframe chargée une fois, toutes les pages défilent */}
            <iframe
              src={previewUrl}
              style={iframeFull}
              title="Bilan complet"
            />
          </div>
          <div style={hint}>
            Aperçu complet 4 pages (défilez pour voir toutes les pages) · Le PDF est généré par Chrome via Playwright
          </div>
        </div>
      </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1v8M4 6l3 3 3-3M2 11h10"
        stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const outer: React.CSSProperties = {
  height: "100vh",
  background: "#0e0c0a",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const topBar: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 50,
  height: 56,
  background: "#1a1815",
  borderBottom: "1px solid #2a2318",
  display: "flex", alignItems: "center",
  justifyContent: "space-between",
  padding: "0 24px", gap: 16,
};

const barCenter: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 9,
};

const barDiamond: React.CSSProperties = {
  display: "inline-block",
  width: 6, height: 6,
  background: "#b89a60",
  transform: "rotate(45deg)",
};

const barLabel: React.CSSProperties = {
  fontSize: 13, fontWeight: 600,
  color: "#c4a86c", letterSpacing: "0.3px",
  fontFamily: "system-ui, sans-serif",
};

const btnBase: React.CSSProperties = {
  height: 36,
  display: "flex", alignItems: "center", gap: 8,
  padding: "0 16px",
  borderRadius: 999,
  fontSize: 13, fontWeight: 600,
  cursor: "pointer",
  fontFamily: "system-ui, sans-serif",
  whiteSpace: "nowrap",
  transition: "opacity 0.15s",
};

const btnGhost: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  border: "1px solid #3a3228",
  color: "#8c7e6e",
};

const btnGold: React.CSSProperties = {
  ...btnBase,
  background: "linear-gradient(135deg,#c9a96e,#b89a60)",
  border: "none",
  color: "#fff",
  boxShadow: "0 4px 20px rgba(184,154,96,0.35)",
};

const spinEl: React.CSSProperties = {
  width: 14, height: 14,
  border: "2px solid rgba(255,255,255,0.25)",
  borderTopColor: "#fff",
  borderRadius: "50%",
  animation: "spin 0.65s linear infinite",
  display: "inline-block",
};

const errorBanner: React.CSSProperties = {
  background: "rgba(184,68,68,0.12)",
  borderBottom: "1px solid rgba(184,68,68,0.3)",
  color: "#e8a0a0",
  fontSize: 12,
  padding: "10px 24px",
  fontFamily: "system-ui, sans-serif",
};

const debugBanner: React.CSSProperties = {
  background: "#1a3a1a",
  borderBottom: "1px solid #2a6a2a",
  color: "#6eff6e",
  fontSize: 13,
  fontWeight: 700,
  padding: "8px 24px",
  fontFamily: "monospace",
  textAlign: "center",
};

const scroll: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: "28px 0 28px",
  display: "flex", flexDirection: "column",
  alignItems: "center", gap: 0,
};

// 4 pages A4 : 4 × 297 mm à 96 dpi = 4 × 1122.5 px → 4490 px
const a4Wrap: React.CSSProperties = {
  width: "794px",
  height: "4490px",    // hauteur explicite = empêche le flex de comprimer le wrapper
  flexShrink: 0,       // flex item ne rétrécit pas quand le conteneur est trop petit
  boxShadow: "0 8px 48px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.4)",
  borderRadius: 2,
  overflow: "hidden",
};

// 4 A4 pages : 4 × 297 mm à 96 dpi = 4 × 1122.5 px → 4490 px
const iframeFull: React.CSSProperties = {
  width: "794px",
  height: "4490px",
  border: "none",
  display: "block",
  pointerEvents: "none",
};

const hint: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11, color: "#3a3028",
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
};
