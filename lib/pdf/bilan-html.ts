// ─── Types ────────────────────────────────────────────────────────────────────

export type BilanPdfData = {
  clientName: string;
  cabinetName: string;
  logoSrc: string;
  hasCustomLogo: boolean;
  contactLine: string;
  addressLine: string;
  dateStr: string;
  total: number;
  axes: Array<{ label: string; value: number; max: number }>;
  activeLim: string[];
  activeRec: string[];
  topPriorities: string[];
  tests: Array<{ label: string; score: 0 | 1 | 2; observation?: string }>;
  energyScore: number | null;
  stressScore: number | null;
  sleepScore: number | null;
  painScore: number | null;
  workType: string | null;
  sportPracticed: string | null;
  sittingHoursPerDay: number | null;
  painZones: string | null;
  frequency: string | null;
  motivation: string | null;
  engagement: string | null;
  mainGoal: string | null;
  concreteGoal: string | null;
  nextAction: string | null;
  importantNotes: string | null;
  painEvolution: string | null;
  oldInjuries: string | null;
  operations: string | null;
  coachName: string;
  coachRole: string | null;
  coachPhotoSrc: string | null;
  qrCodeDataUrl: string | null;
  bodyComposition: {
    weightKg: number | null;
    fatPct: number | null;
    musclePct: number | null;
    waterPct: number | null;
    boneMassKg: number | null;
    visceralFat: number | null;
    bmrKcal: number | null;
    metabolicAge: number | null;
    segArmRight: number | null;
    segArmLeft: number | null;
    segLegRight: number | null;
    segLegLeft: number | null;
    segTrunk: number | null;
  } | null;
  zonePriorities: Record<string, "forte" | "surveillance" | "ras"> | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatName(name: string): string {
  return name.replace(/([a-zàâäéèêëïîôöùûüÿ])([A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ])/g, "$1 $2").trim();
}

function coachInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function scoreColor(s: number): string {
  return s >= 80 ? "#2E7D52" : s >= 60 ? "#B8956A" : s >= 40 ? "#C47040" : "#B84444";
}

function barColor(pct: number): string {
  return pct >= 75 ? "#2E7D52" : pct >= 50 ? "#B8956A" : pct >= 25 ? "#C47040" : "#B84444";
}

function statusLabel(score: number): string {
  if (score >= 70) return "Bon niveau";
  if (score >= 45) return "En progression";
  return "À travailler";
}

function secTitle(label: string): string {
  return `<div class="sec-head">
    <span class="sec-label">${esc(label.toUpperCase())}</span>
    <div class="sec-rule"></div>
  </div>`;
}

// ─── SVG : Score gauge ────────────────────────────────────────────────────────

function gaugeSvg(score: number): string {
  const cx = 72, cy = 72, R = 56;
  const circ   = 2 * Math.PI * R;
  const filled = (circ * Math.min(score, 100) / 100).toFixed(2);
  const gap    = (circ - circ * Math.min(score, 100) / 100).toFixed(2);
  const col    = scoreColor(score);
  const displayVal = (score / 10).toFixed(1).replace(".", ",");
  const numSize    = displayVal.length >= 4 ? 34 : 42;
  const numY       = displayVal.length >= 4 ? cy + 12 : cy + 15;

  const ticks = Array.from({ length: 40 }, (_, i) => {
    const a     = -Math.PI / 2 + (2 * Math.PI * i / 40);
    const major = i % 8 === 0;
    const ro    = major ? 67 : 64;
    const ri    = 59;
    const x1    = (cx + ro * Math.cos(a)).toFixed(1);
    const y1    = (cy + ro * Math.sin(a)).toFixed(1);
    const x2    = (cx + ri * Math.cos(a)).toFixed(1);
    const y2    = (cy + ri * Math.sin(a)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C8C0B0" stroke-width="${major ? "0.7" : "0.35"}" opacity="${major ? "0.55" : "0.26"}"/>`;
  }).join("");

  return `<svg width="164" height="164" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="#E4DCD0" stroke-width="0.4" opacity="0.6"/>
    ${ticks}
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#EAE2D8" stroke-width="1.2"/>
    <circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#EEE8E0" stroke-width="0.35" opacity="0.5"/>
    <g transform="rotate(-90,${cx},${cy})">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
        stroke="${col}" stroke-width="1.5"
        stroke-dasharray="${filled} ${gap}"
        stroke-linecap="round"/>
    </g>
    <line x1="${cx - 11}" y1="${cy - 5}" x2="${cx + 11}" y2="${cy - 5}"
      stroke="#D4C4A8" stroke-width="0.5" opacity="0.7"/>
    <text x="${cx}" y="${numY}" text-anchor="middle"
      font-family="'Playfair Display',Georgia,serif"
      font-size="${numSize}" font-weight="800" fill="${col}">${displayVal}</text>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle"
      font-family="'Inter',-apple-system,sans-serif"
      font-size="8" font-weight="300" fill="#C4B4A2" letter-spacing="1.5">/ 10</text>
  </svg>`;
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}

body{
  font-family:'Inter',-apple-system,'Helvetica Neue',Arial,sans-serif;
  background:#F2EEE7;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}

.page{
  width:210mm;height:297mm;
  overflow:hidden;
  display:flex;flex-direction:column;
  background:#F2EEE7;
  page-break-after:always;
}
.page:last-child{page-break-after:auto}

/* ═══════════ HEADER ═══════════ */
.doc-header{
  flex:0 0 28mm;
  background:linear-gradient(180deg,#FFFFFF 0%,#FAF8F4 100%);
  display:flex;align-items:center;justify-content:space-between;
  padding:0 12mm;
  border-bottom:1pt solid #C8A87A;
}
.header-brand{display:flex;align-items:center;gap:16pt}
.logo-img{
  height:90px;width:auto;max-width:320px;
  object-fit:contain;object-position:left center;
  display:block;flex-shrink:0;
  filter:drop-shadow(0 0 14px rgba(184,149,106,0.20)) drop-shadow(0 1px 4px rgba(30,24,18,0.09));
}
.brand-sep{width:0.7pt;height:56px;background:linear-gradient(180deg,transparent,#C8BEA8 30%,#C8BEA8 70%,transparent);flex-shrink:0}
.brand-text{display:flex;flex-direction:column;gap:2pt}
.cabinet-name{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#100C08;letter-spacing:-0.6px}
.cabinet-tagline{font-size:10px;font-weight:500;color:#C09A6C;letter-spacing:2.5px;text-transform:uppercase;margin-top:2pt}
.cabinet-sub{font-size:11px;color:#A89C8C;margin-top:2pt}
.header-right{text-align:right;display:flex;flex-direction:column;gap:2pt;border-left:0.5pt solid #EDE5DA;padding-left:12pt}
.header-date-lbl{font-size:10px;font-weight:600;color:#C09A6C;letter-spacing:2px;text-transform:uppercase}
.header-date-val{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:#1A1410;letter-spacing:-0.2px}

/* ═══════════ HERO ═══════════ */
.hero{
  flex:0 0 62mm;display:flex;position:relative;
  background-color:#F7F4EF;
  background-image:
    radial-gradient(ellipse 70% 120% at 112% 50%, rgba(184,149,106,0.13) 0%, transparent 60%),
    linear-gradient(180deg, rgba(255,253,250,0.50) 0%, transparent 32%);
  border-bottom:0.7pt solid #DDD5C8;
}
.hero-accent{width:5mm;flex-shrink:0;background:linear-gradient(180deg,#EAD9AE 0%,#B8956A 35%,#9A7A52 80%,#7A5A38 100%)}
.hero-main{flex:1;display:flex;align-items:center;padding:0 10mm 0 9mm;gap:0}
.hero-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:0;padding-right:6mm}
.hero-overline{font-size:11px;font-weight:700;color:#B8956A;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt}
.hero-name{
  font-family:'Playfair Display',Georgia,'Times New Roman',serif;
  font-size:68px;font-weight:800;color:#0D0905;
  line-height:0.85;letter-spacing:-3px;margin-bottom:12pt;
  text-shadow:0 1px 6px rgba(20,14,9,0.08);
}
.hero-coach-row{display:flex;align-items:center;gap:9pt;padding-top:10pt;border-top:0.6pt solid #E4DCD4}
.coach-avatar{width:34px;height:34px;border-radius:50%;background:#1E1812;flex-shrink:0;display:flex;align-items:center;justify-content:center;border:1.5pt solid #B8956A}
.coach-initials{font-family:'Playfair Display',Georgia,serif;font-size:11px;font-weight:700;color:#E8D5A8;line-height:1}
.coach-info{display:flex;flex-direction:column;gap:2pt;min-width:0}
.coach-name-txt{font-size:13px;font-weight:700;color:#4A3C30;letter-spacing:0.2px}
.hero-score{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4pt;padding-left:8mm;border-left:0.8pt solid #E0D6CA}
.hero-score-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;text-align:center;color:#B8956A}
.hero-score-status{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;text-align:center;letter-spacing:-0.1px}

/* ═══════════ PAGE 1 — 2 COLONNES ═══════════ */
.p1-body{flex:1;padding:5mm 12mm 5mm;display:flex;gap:6mm;overflow:hidden;min-height:0}
.p1-col{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.p1-col-card{
  flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;
  background:#FDFCF9;border-radius:11pt;padding:13pt 16pt 11pt;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 16pt rgba(30,24,18,0.07);
  border:0.5pt solid rgba(184,149,106,0.10);
}

/* ═══════════ AXES ═══════════ */
.sec-head{display:flex;align-items:center;margin-bottom:10pt}
.sec-label{font-size:10px;font-weight:700;color:#A89070;letter-spacing:2.5px;text-transform:uppercase;white-space:nowrap}
.sec-rule{flex:1;height:0.4pt;background:linear-gradient(90deg,#E0D6CA,transparent);margin-left:10pt}

.axes-card{flex-shrink:0;background:#FDFCF9;border-radius:11pt;padding:13pt 16pt 11pt;box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 16pt rgba(30,24,18,0.07);border:0.5pt solid rgba(184,149,106,0.10)}
.axis-row{display:flex;align-items:center;padding:5pt 0;gap:12pt}
.axis-row+.axis-row{border-top:0.4pt solid #F2EBE2}
.axis-lbl{font-size:11px;font-weight:700;color:#9A8C80;letter-spacing:0.8px;text-transform:uppercase;width:62pt;flex-shrink:0}
.axis-track{flex:1;height:5pt;border-radius:99pt;background:#EDE5DA;overflow:hidden}
.axis-fill{height:5pt;border-radius:99pt}
.axis-num{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;width:22pt;text-align:right;flex-shrink:0;line-height:1}
.axis-den{font-size:12px;color:#B8A898;width:18pt;flex-shrink:0;line-height:1}

/* ═══════════ PROGRAMME ═══════════ */
.prog-list{display:flex;flex-direction:column;flex:1;margin-bottom:6pt}
.prog-item{padding:8pt 0;border-bottom:0.4pt solid #EDE5DA;display:flex;flex-direction:column;gap:3pt}
.prog-item:last-child{border-bottom:none}
.prog-meta{display:flex;align-items:center;gap:7pt;margin-bottom:1pt}
.prog-rank{font-family:'Playfair Display',Georgia,serif;font-size:10px;font-weight:700;color:#D8D0C0}
.prog-step{font-size:10px;font-weight:700;color:#B8956A;letter-spacing:2px;text-transform:uppercase}
.prog-name{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:#1A1410;line-height:1.25}
.freq-badge{border-radius:7pt;background:#1E1812;padding:9pt 13pt;margin-top:auto;border-left:3pt solid #B8956A;flex-shrink:0}
.freq-lbl{font-size:10px;font-weight:700;color:#B8956A;letter-spacing:2px;text-transform:uppercase;margin-bottom:4pt}
.freq-val{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:#F5EFE5;line-height:1.3}

/* ═══════════ FOOTER ═══════════ */
.footer{flex:0 0 9mm;background:#FDFCF9;display:flex;align-items:center;justify-content:space-between;padding:0 12mm;border-top:0.6pt solid #E0D6CA}
.footer-text{font-size:12px;color:#B8A898;letter-spacing:0.3px}
.footer-dot{font-size:7px;color:#B8956A}

/* ═══════════ MINI HEADER (page 2) ═══════════ */
.mini-header{flex:0 0 13mm;background:#1E1812;display:flex;align-items:center;justify-content:space-between;padding:0 12mm;border-bottom:1pt solid rgba(184,149,106,0.3)}
.mini-left{display:flex;align-items:center;gap:9pt}
.mini-dia{width:4.5pt;height:4.5pt;background:#B8956A;transform:rotate(45deg);flex-shrink:0}
.mini-client{font-family:'Playfair Display',Georgia,serif;font-size:12px;font-weight:700;color:#F5EFE5}
.mini-sub{font-size:11px;color:#6A5A48}
.mini-pg{font-size:11px;color:#6A5A48;letter-spacing:0.4px}

/* ═══════════ BODY PAGE 2 ═══════════ */
.body2{flex:1;padding:5mm 12mm 4mm;display:flex;flex-direction:column;overflow:hidden}

/* ═══════════ OBSERVATIONS ═══════════ */
.obs-editorial{padding:12pt 16pt 12pt 20pt;border-left:4pt solid #B8956A;background:rgba(255,253,248,0.65);border-radius:0 8pt 8pt 0;margin-bottom:4mm;flex-shrink:0}
.obs-text{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-style:italic;color:#1E1610;line-height:1.75;margin-bottom:6pt}
.obs-text-sub{font-size:13px;color:#6A5E52;line-height:1.6}

/* ═══════════ OBJECTIF PROCHAIN BILAN ═══════════ */
.nb-card{background:#1E1812;border-radius:9pt;padding:13pt 18pt;box-shadow:0 6pt 28pt rgba(30,24,18,0.44),0 2pt 6pt rgba(30,24,18,0.22);flex-shrink:0;margin-bottom:4mm;border-left:6pt solid #B8956A;border-top:0.5pt solid rgba(184,149,106,0.22);border-right:0.5pt solid rgba(184,149,106,0.22);border-bottom:0.5pt solid rgba(184,149,106,0.22)}
.nb-card .sec-label{color:rgba(184,149,106,0.90)}
.nb-card .sec-rule{background:linear-gradient(90deg,rgba(184,149,106,0.38),transparent)}
.nb-row{display:flex;align-items:center;gap:0;margin-top:8pt}
.nb-col{display:flex;flex-direction:column;align-items:center;flex:1}
.nb-lbl{font-size:11px;font-weight:700;color:rgba(184,149,106,0.65);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6pt;text-align:center}
.nb-score{font-family:'Playfair Display',Georgia,serif;font-size:34px;font-weight:800;line-height:1}
.nb-unit{font-size:13px;font-weight:400;color:rgba(184,149,106,0.55);margin-left:1pt}
.nb-delay{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;color:#E8DDD0;text-align:center;line-height:1.25}
.nb-arrow{font-size:20px;color:#B8956A;padding:0 8pt 2pt;flex-shrink:0}
.nb-sep{width:0.5pt;height:30px;background:linear-gradient(180deg,transparent,rgba(184,149,106,0.42) 30%,rgba(184,149,106,0.42) 70%,transparent);flex-shrink:0;margin:0 10pt 2pt}

/* ═══════════ PROJECTION 6 SEMAINES ═══════════ */
.proj-card{padding:10pt 0 8pt;margin-bottom:4mm;flex-shrink:0;border-top:0.5pt solid #E4DCD4}
.proj-steps{display:flex;align-items:flex-start;gap:0;margin-top:10pt}
.proj-step{flex:1;display:flex;flex-direction:column;align-items:flex-start;position:relative}
.proj-connector{flex:0 0 18pt;display:flex;align-items:flex-start;padding-top:8pt;justify-content:center}
.proj-connector-line{width:100%;height:0.5pt;background:linear-gradient(90deg,#D4C4A8 0%,#B8956A 50%,#D4C4A8 100%)}
.proj-num{width:22px;height:22px;border-radius:50%;background:#1E1812;font-family:'Playfair Display',Georgia,serif;font-size:10px;font-weight:700;color:#E8D5A8;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-bottom:5pt;border:1pt solid #B8956A}
.proj-title{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;color:#1A1410;margin-bottom:2pt}
.proj-week{font-size:10px;font-weight:700;color:#B8956A;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3pt}
.proj-desc{font-size:13px;color:#6A5E52;line-height:1.5;padding-right:6pt}

/* ═══════════ TESTS ═══════════ */
.tests-card{flex-shrink:0;background:#FDFCF9;border-radius:10pt;overflow:hidden;box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 14pt rgba(30,24,18,0.06);border:0.5pt solid rgba(184,149,106,0.09);margin-bottom:4mm}
.tests-hd{padding:11pt 14pt 0}
.test-row{display:flex;align-items:stretch;padding:8pt 14pt}
.test-row+.test-row{border-top:0.4pt solid #F2EBE2}
.test-bar{width:3pt;border-radius:99pt;margin-right:12pt;flex-shrink:0;align-self:stretch}
.test-body{flex:1}
.test-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:2pt}
.test-name{font-size:14px;font-weight:700;color:#1A1410}
.test-badge{font-size:11px;font-weight:700;padding:2pt 9pt;border-radius:99pt;border-width:0.7pt;border-style:solid;letter-spacing:0.5px;text-transform:uppercase}
.test-obs{font-family:'Playfair Display',Georgia,serif;font-size:12px;font-style:italic;color:#9A8C80;line-height:1.5}

/* ═══════════ ZONES + COMPOSITION — ROW ═══════════ */
.p2-side-row{display:flex;gap:5mm;flex-shrink:0;margin-bottom:4mm;align-items:flex-start}
.p2-side-col{flex:1;min-width:0}

/* Zones chips */
.z-chip{font-size:12px;font-weight:600;padding:4pt 10pt;border-radius:99pt;border-width:0.8pt;border-style:solid;display:inline-block;margin:3pt 4pt 0 0}
.z-forte{color:#8A2020;background:#F5E0E0;border-color:#D88080}
.z-surv{color:#7A4010;background:#F5E8D8;border-color:#D8A870}

/* Composition compacte */
.comp2-grid{display:grid;grid-template-columns:1fr 1fr;gap:8pt 12pt;margin-top:8pt}
.comp2-item{display:flex;flex-direction:column;gap:2pt}
.comp2-k{font-size:11px;font-weight:700;color:#B8A898;letter-spacing:1px;text-transform:uppercase}
.comp2-v{font-family:'Playfair Display',Georgia,serif;font-size:20px;font-weight:700;color:#1A1410;line-height:1}
.comp2-u{font-family:'Inter',-apple-system,sans-serif;font-size:12px;font-weight:400;color:#9A8C80;margin-left:2pt}

/* Recommandations */
.rec-chips{display:flex;flex-wrap:wrap;gap:0;margin-top:6pt}
.rec-chip{font-size:12px;font-weight:600;padding:4pt 11pt;border-radius:99pt;border-width:0.7pt;border-style:solid;color:#4A3C30;background:#EDE3D0;border-color:#D8C8B0;display:inline-block;margin:3pt 5pt 0 0}

/* ═══════════ CLOSING ═══════════ */
.closing{flex-shrink:0;margin-top:auto;padding-top:4mm;text-align:center}
.closing-rule-row{display:flex;align-items:center;margin-bottom:10pt}
.closing-rule-line{flex:1;height:0.5pt;background:linear-gradient(90deg,transparent,#DDD5C8 30%,#DDD5C8 70%,transparent)}
.closing-dia{width:5pt;height:5pt;background:#B8956A;transform:rotate(45deg);margin:0 10pt;flex-shrink:0}
.closing-inner{display:flex;flex-direction:column;align-items:center;gap:3pt}
.closing-name{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:#1A1410;letter-spacing:-0.3px}
.closing-tagline{font-size:12px;color:#9A8C80;letter-spacing:0.3px;margin-top:1pt}
.closing-contact{font-size:12px;color:#B8A898;margin-top:2pt}
.closing-conf{font-size:11px;color:#C4B8A8;letter-spacing:0.5px;text-transform:uppercase;margin-top:4pt}
`;

// ─── Shared components ────────────────────────────────────────────────────────

function miniHeader(clientName: string, subtitle: string, dateStr: string, page: string): string {
  return `<div class="mini-header">
    <div class="mini-left">
      <div class="mini-dia"></div>
      <span class="mini-client">${esc(clientName)}</span>
      <span class="mini-sub">· ${esc(subtitle)}</span>
    </div>
    <span class="mini-pg">${esc(dateStr)} · ${esc(page)}</span>
  </div>`;
}

function pageFooter(cabinetName: string, right: string): string {
  return `<div class="footer">
    <span class="footer-text">${esc(cabinetName)}</span>
    <span class="footer-dot">◆</span>
    <span class="footer-text">${esc(right)}</span>
  </div>`;
}

function closingBlock(d: BilanPdfData): string {
  const contact = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");
  return `<div class="closing">
    <div class="closing-rule-row">
      <div class="closing-rule-line"></div>
      <div class="closing-dia"></div>
      <div class="closing-rule-line"></div>
    </div>
    <div class="closing-inner">
      <span class="closing-name">${esc(d.cabinetName)}</span>
      <div class="closing-tagline">Cabinet spécialisé mouvement &amp; performance</div>
      ${contact ? `<div class="closing-contact">${esc(contact)}</div>` : ""}
      <div class="closing-conf">Document confidentiel · ${esc(d.dateStr)}</div>
    </div>
  </div>`;
}

// ─── Page 1 : sections ────────────────────────────────────────────────────────

function axisSection(axes: BilanPdfData["axes"]): string {
  const rows = axes.map(a => {
    const pct = (a.value / a.max) * 100;
    const col = barColor(pct);
    return `<div class="axis-row">
      <span class="axis-lbl">${esc(a.label.toUpperCase())}</span>
      <div class="axis-track"><div class="axis-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div></div>
      <span class="axis-num" style="color:${col}">${a.value}</span>
      <span class="axis-den">/${a.max}</span>
    </div>`;
  }).join("");
  return `<div class="axes-card">${secTitle("Évaluation des 5 axes")}${rows}</div>`;
}

function programmeSection(priorities: string[], frequency: string | null): string {
  const steps = [
    priorities[0] && { rank: "01", label: "Maintenant", name: priorities[0] },
    priorities[1] && { rank: "02", label: "Ensuite",    name: priorities[1] },
    priorities[2] && { rank: "03", label: "Puis",       name: priorities[2] },
  ].filter(Boolean) as Array<{ rank: string; label: string; name: string }>;

  const stepsHtml = steps.map(s => `<div class="prog-item">
    <div class="prog-meta">
      <span class="prog-rank">${s.rank}</span>
      <span class="prog-step">${esc(s.label.toUpperCase())}</span>
    </div>
    <div class="prog-name">→ ${esc(s.name)}</div>
  </div>`).join("");

  const freqHtml = frequency ? `<div class="freq-badge">
    <div class="freq-lbl">Fréquence conseillée</div>
    <div class="freq-val">${esc(frequency)}</div>
  </div>` : "";

  return `${secTitle("Programme recommandé")}
    <div class="prog-list">${stepsHtml}</div>
    ${freqHtml}`;
}

// ─── Page 2 : sections ────────────────────────────────────────────────────────

function observationsBlock(d: BilanPdfData): string {
  const scored = d.axes.map(a => ({ n: a.label.toLowerCase(), pct: Math.round((a.value / a.max) * 100) }));
  const strong = scored.filter(a => a.pct >= 60).map(a => a.n);
  const weak   = scored.filter(a => a.pct < 45).map(a => a.n);

  const chain = (names: string[]) =>
    names.length === 1
      ? `votre ${names[0]}`
      : names.slice(0, -1).map(n => `votre ${n}`).join(", ") + ` et votre ${names[names.length - 1]}`;

  let mainText: string;
  let subText: string;

  if (strong.length > 0 && weak.length > 0) {
    const sp = strong.length > 1 ? "sont à un bon niveau" : "est à un bon niveau";
    const wp = weak.length > 1   ? "freinent encore certains de vos mouvements" : "freine encore certains de vos mouvements";
    mainText = `${(chain(strong).charAt(0).toUpperCase() + chain(strong).slice(1))} ${sp}, mais ${chain(weak)} ${wp}.`;
    subText  = `Ce déséquilibre est courant à ce stade du parcours. En ciblant les axes prioritaires, vous progresserez de façon notable d'ici votre prochain bilan.`;
  } else if (weak.length > 0) {
    const wp = weak.length > 1 ? "demandent" : "demande";
    mainText = `${(chain(weak).charAt(0).toUpperCase() + chain(weak).slice(1))} ${wp} une attention particulière pour améliorer votre confort au quotidien.`;
    subText  = `Votre programme a été conçu pour cibler précisément ces axes. Des progrès mesurables sont attendus dès les premières semaines.`;
  } else if (strong.length > 0) {
    mainText = `Tous vos axes sont bien développés, avec une répartition équilibrée sur les 5 dimensions évaluées.`;
    subText  = `L'objectif du prochain cycle est de consolider ces acquis et d'atteindre un niveau d'excellence durable sur chaque dimension.`;
  } else {
    mainText = `Votre profil de mouvement est en développement régulier, avec des marges de progression sur chacun des 5 axes évalués.`;
    subText  = `Votre programme personnalisé a été conçu pour vous faire progresser à votre rythme, de façon cohérente et mesurable.`;
  }

  return `<div class="obs-editorial">
    ${secTitle("Ce que nous avons observé")}
    <div class="obs-text">${esc(mainText)}</div>
    <div class="obs-text-sub">${esc(subText)}</div>
  </div>`;
}

function nextBilanBlock(total: number): string {
  const current   = (total / 10).toFixed(1).replace(".", ",");
  const targetRaw = Math.min(total + 15, 100);
  const target    = (targetRaw / 10).toFixed(1).replace(".", ",");
  return `<div class="nb-card">
    ${secTitle("Objectif du prochain bilan")}
    <div class="nb-row">
      <div class="nb-col">
        <div class="nb-lbl">Score actuel</div>
        <div class="nb-score" style="color:${scoreColor(total)}">${current}<span class="nb-unit"> /10</span></div>
      </div>
      <div class="nb-arrow">→</div>
      <div class="nb-col">
        <div class="nb-lbl">Objectif</div>
        <div class="nb-score" style="color:${scoreColor(targetRaw)}">${target}<span class="nb-unit"> /10</span></div>
      </div>
      <div class="nb-sep"></div>
      <div class="nb-col">
        <div class="nb-lbl">Prochain bilan</div>
        <div class="nb-delay">Dans 6 semaines</div>
      </div>
    </div>
  </div>`;
}

function projectionBlock(priorities: string[], concreteGoal: string | null): string {
  const steps = [
    { week: "Sem. 1–2", title: "Maintenant",   content: priorities[0] || null },
    { week: "Sem. 3–4", title: "Ensuite",       content: priorities[1] || null },
    { week: "Sem. 5–6", title: "Objectif visé", content: priorities[2] || concreteGoal || null },
  ];

  const stepsHtml = steps.map((s, i) => `
    <div class="proj-step">
      <div class="proj-num">${i + 1}</div>
      <div class="proj-week">${esc(s.week)}</div>
      <div class="proj-title">${esc(s.title)}</div>
      ${s.content ? `<div class="proj-desc">${esc(s.content)}</div>` : ""}
    </div>
    ${i < 2 ? '<div class="proj-connector"><div class="proj-connector-line"></div></div>' : ""}
  `).join("");

  return `<div class="proj-card">
    ${secTitle("Projection 6 semaines")}
    <div class="proj-steps">${stepsHtml}</div>
  </div>`;
}

function testsBlock(tests: BilanPdfData["tests"]): string {
  if (!tests.length) return "";
  const CFG = {
    0: { label: "DOULEUR",      bg: "#FEF4F4", border: "#F0C0C0", text: "#8A2828", bar: "#C44444" },
    1: { label: "COMPENSATION", bg: "#FDF9F2", border: "#E8CFA0", text: "#7A5020", bar: "#C47040" },
    2: { label: "OPTIMAL",      bg: "#F2FBF6", border: "#A4DEBA", text: "#1A5C38", bar: "#2E7D52" },
  } as const;

  const rows = tests.map(t => {
    const cfg = CFG[t.score];
    return `<div class="test-row">
      <div class="test-bar" style="background:${cfg.bar}"></div>
      <div class="test-body">
        <div class="test-top">
          <span class="test-name">${esc(t.label)}</span>
          <span class="test-badge" style="background:${cfg.bg};border-color:${cfg.border};color:${cfg.text}">${cfg.label}</span>
        </div>
        ${t.observation ? `<div class="test-obs">${esc(t.observation)}</div>` : ""}
      </div>
    </div>`;
  }).join("");

  return `<div class="tests-card">
    <div class="tests-hd">${secTitle("Tests de mouvement")}</div>
    ${rows}
  </div>`;
}

function zonesBlock(zonePriorities: NonNullable<BilanPdfData["zonePriorities"]>): string {
  const LABELS: Record<string, string> = {
    cervicales:        "Ceinture cervicale",
    dos_haut:          "Ceinture scapulaire",
    epaules:           "Épaules",
    pectoraux:         "Pectoraux",
    grand_dorsal:      "Grand dorsal",
    lombaires:         "Lombaires",
    sangle_abdominale: "Sangle abdominale",
    bassin:            "Bassin",
    hanches:           "Hanches",
    fessiers:          "Fessiers",
    quadriceps:        "Quadriceps",
    ischio_jambiers:   "Ischio-jambiers",
    mollets:           "Mollets",
    chevilles:         "Chevilles",
    pieds:             "Pieds",
    genoux:            "Genoux",
  };

  const fortes = Object.entries(zonePriorities)
    .filter(([, v]) => v === "forte")
    .map(([k]) => LABELS[k] ?? k);
  const survs = Object.entries(zonePriorities)
    .filter(([, v]) => v === "surveillance")
    .map(([k]) => LABELS[k] ?? k);

  if (!fortes.length && !survs.length) return "";

  const chips = [
    ...fortes.map(l => `<span class="z-chip z-forte">${esc(l)}</span>`),
    ...survs.map(l => `<span class="z-chip z-surv">${esc(l)}</span>`),
  ].join("");

  return `<div>
    ${secTitle("Zones prioritaires")}
    <div style="margin-top:6pt">${chips}</div>
  </div>`;
}

function compositionBlock(bc: NonNullable<BilanPdfData["bodyComposition"]>): string {
  const items = [
    bc.weightKg  !== null ? { k: "Poids",           v: bc.weightKg!.toFixed(1).replace(".", ","),  u: "kg" } : null,
    bc.fatPct    !== null ? { k: "Masse grasse",     v: bc.fatPct!.toFixed(1).replace(".", ","),    u: "%" }  : null,
    bc.musclePct !== null ? { k: "Masse musculaire", v: bc.musclePct!.toFixed(1).replace(".", ","), u: "%" }  : null,
    bc.waterPct  !== null ? { k: "Eau",              v: bc.waterPct!.toFixed(1).replace(".", ","),  u: "%" }  : null,
  ].filter(Boolean) as Array<{ k: string; v: string; u: string }>;

  if (!items.length) return "";

  return `<div>
    ${secTitle("Composition corporelle")}
    <div class="comp2-grid">
      ${items.map(it => `<div class="comp2-item">
        <span class="comp2-k">${esc(it.k)}</span>
        <span class="comp2-v">${esc(it.v)}<span class="comp2-u">${esc(it.u)}</span></span>
      </div>`).join("")}
    </div>
  </div>`;
}

function recommendationsBlock(activeRec: string[]): string {
  if (!activeRec.length) return "";
  const chips = activeRec.map(r => `<span class="rec-chip">${esc(r)}</span>`).join("");
  return `<div style="margin-bottom:4mm;flex-shrink:0">
    ${secTitle("Recommandations")}
    <div class="rec-chips">${chips}</div>
  </div>`;
}

// ─── Générateur principal : 2 pages fixes ────────────────────────────────────

export function generateBilanHtml(d: BilanPdfData, _mode: "client" | "coach" = "coach"): string {
  const clientDisplayName = formatName(d.clientName);
  const color             = scoreColor(d.total);
  const status            = statusLabel(d.total);
  const footerTxt         = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");

  const hasProg     = d.topPriorities.length > 0 || !!d.frequency;
  const hasTests    = d.tests.length > 0;
  const hasProj     = d.topPriorities.length > 0 || !!d.concreteGoal;
  const hasZones    = !!(d.zonePriorities && Object.entries(d.zonePriorities).some(([, v]) => v === "forte" || v === "surveillance"));
  const hasBodyComp = !!(d.bodyComposition && (
    d.bodyComposition.weightKg !== null ||
    d.bodyComposition.fatPct   !== null ||
    d.bodyComposition.musclePct !== null ||
    d.bodyComposition.waterPct !== null
  ));
  const hasRec      = d.activeRec.length > 0;
  const hasSideRow  = hasZones || hasBodyComp;

  // Branding
  const brandHtml = `<img class="logo-img" src="${esc(d.logoSrc)}" alt="${esc(d.cabinetName)}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='none'">
    <div class="brand-sep"></div>
    <div class="brand-text">
      <span class="cabinet-name">${esc(d.cabinetName)}</span>
      <span class="cabinet-tagline">Mouvement · Performance · Bien-être</span>
      ${d.contactLine ? `<span class="cabinet-sub">${esc(d.contactLine)}</span>` : ""}
    </div>`;

  // ─── PAGE 1 : Synthèse client ──────────────────────────────────────────────
  const page1 = `
<div class="page">
  <div class="doc-header">
    <div class="header-brand">${brandHtml}</div>
    <div class="header-right">
      <span class="header-date-lbl">Bilan du</span>
      <span class="header-date-val">${esc(d.dateStr)}</span>
    </div>
  </div>
  <div class="hero">
    <div class="hero-accent"></div>
    <div class="hero-main">
      <div class="hero-text">
        <div class="hero-overline">Bilan mouvement personnalisé</div>
        <div class="hero-name">${esc(clientDisplayName)}</div>
        <div class="hero-coach-row">
          <div class="coach-avatar"><span class="coach-initials">${coachInitials(d.coachName)}</span></div>
          <div class="coach-info"><span class="coach-name-txt">${esc(d.coachName)}</span></div>
        </div>
      </div>
      <div class="hero-score">
        ${gaugeSvg(d.total)}
        <div class="hero-score-lbl">Score global</div>
        <div class="hero-score-status" style="color:${color}">${esc(status)}</div>
      </div>
    </div>
  </div>
  <div class="p1-body">
    <div class="p1-col">
      ${axisSection(d.axes)}
    </div>
    ${hasProg ? `<div class="p1-col-card">
      ${programmeSection(d.topPriorities, d.frequency)}
    </div>` : ""}
  </div>
  ${pageFooter(d.cabinetName, footerTxt || `Document confidentiel · ${d.dateStr}`)}
</div>`;

  // ─── PAGE 2 : Feuille de route ─────────────────────────────────────────────
  const sideRow = hasSideRow ? `<div class="p2-side-row">
    ${hasZones    ? `<div class="p2-side-col">${zonesBlock(d.zonePriorities!)}</div>` : ""}
    ${hasBodyComp ? `<div class="p2-side-col">${compositionBlock(d.bodyComposition!)}</div>` : ""}
  </div>` : "";

  const page2 = `
<div class="page">
  ${miniHeader(clientDisplayName, "Feuille de route", d.dateStr, "Page 2")}
  <div class="body2">
    ${observationsBlock(d)}
    ${nextBilanBlock(d.total)}
    ${hasProj ? projectionBlock(d.topPriorities, d.concreteGoal) : ""}
    ${hasTests ? testsBlock(d.tests) : ""}
    ${sideRow}
    ${hasRec ? recommendationsBlock(d.activeRec) : ""}
    ${closingBlock(d)}
  </div>
  ${pageFooter(d.cabinetName, "Rapport client confidentiel · Page 2 / 2")}
</div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bilan Mouvement — ${esc(clientDisplayName)}</title>
  <style>${CSS}</style>
</head>
<body>
${page1}
${page2}
</body>
</html>`;
}
