// ─── Types ────────────────────────────────────────────────────────────────────

export type BilanPdfData = {
  clientName: string;
  sexe: "femme" | "homme" | null;
  age: number | null;
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
  mainLimitation?: string | null;
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
  bodyMapUrl: string;
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

function scoreColor(s: number): string {
  return s >= 64 ? "#2E7D52" : s >= 48 ? "#B8956A" : s >= 32 ? "#C47040" : "#B84444";
}

function barColor(pct: number): string {
  return pct >= 75 ? "#2E7D52" : pct >= 50 ? "#B8956A" : pct >= 25 ? "#C47040" : "#B84444";
}

// ─── Seuils d'interprétation par axe (facilement modifiables) ────────────────
// Format : score sur 20 → label + couleur
const AXIS_THRESHOLDS: Array<{ maxScore: number; label: string; color: string }> = [
  { maxScore: 5,  label: "Prioritaire",  color: "#C44444" },
  { maxScore: 10, label: "À développer", color: "#C47040" },
  { maxScore: 15, label: "Bon niveau",   color: "#B8956A" },
  { maxScore: 20, label: "Point fort",   color: "#2E7D52" },
];

function axisInterp(value: number): { label: string; color: string } {
  for (const t of AXIS_THRESHOLDS) {
    if (value <= t.maxScore) return { label: t.label, color: t.color };
  }
  return { label: "Point fort", color: "#2E7D52" };
}

// ─── Niveaux de profil (5 paliers, toujours valorisants) ─────────────────────
// Calculé depuis le total /80. Modifier minScore pour ajuster les paliers.
const PROFILE_LEVELS: Array<{ minScore: number; label: string; desc: string; color: string }> = [
  { minScore: 72, label: "Performant",    desc: "Un profil remarquable, construit par une pratique régulière.",                              color: "#2E7D52" },
  { minScore: 60, label: "Solide",        desc: "Vos bases sont solides. Le programme va vous permettre d'aller encore plus loin.",           color: "#3E8A68" },
  { minScore: 48, label: "Bien engagé",   desc: "Votre corps répond bien. Quelques axes à optimiser pour gagner en confort et en efficacité.", color: "#B8956A" },
  { minScore: 32, label: "En progression", desc: "Vous avez de belles marges de progression devant vous. C'est exactement là que le travail fait la différence.", color: "#C47040" },
  { minScore: 0,  label: "À développer",  desc: "Un beau chemin s'ouvre devant vous. Chaque séance vous rapprochera d'un meilleur confort au quotidien.", color: "#B8956A" },
];

function profileLevel(total: number): typeof PROFILE_LEVELS[0] {
  return PROFILE_LEVELS.find(p => total >= p.minScore) ?? PROFILE_LEVELS[PROFILE_LEVELS.length - 1];
}

// ─── Textes "Pourquoi travailler ces axes" (simples, accessibles) ─────────────
const WHY_AXES_TEXT: Record<string, string> = {
  "mobilité":     "Gagner en mobilité facilite les gestes du quotidien et réduit les tensions articulaires persistantes.",
  "stabilité":    "Un meilleur contrôle postural protège vos articulations et élimine les compensations musculaires.",
  "posture":      "Rééquilibrer la posture soulage les douleurs du dos, des épaules et de la nuque.",
  "coordination": "Des mouvements plus fluides et sécurisés réduisent le risque de blessure dans toutes vos activités.",
};

// ─── Projections 6 semaines par axe (utilisées dans la feuille de route) ──────
const AXIS_PROJECTIONS: Record<string, string> = {
  "mobilité":     "Amélioration de votre amplitude articulaire et réduction des raideurs quotidiennes",
  "stabilité":    "Meilleur contrôle postural et réduction des compensations musculaires",
  "posture":      "Rééquilibrage musculaire et soulagement des tensions chroniques",
  "coordination": "Mouvements plus fluides et sécurisés dans toutes vos activités",
};

function sec(label: string): string {
  return `<div class="sec"><span class="sec-lbl">${esc(label.toUpperCase())}</span><div class="sec-rule"></div></div>`;
}

// ─── SVG : grande jauge (score panel page 1) ─────────────────────────────────

function gaugeLarge(score: number): string {
  const cx = 58, cy = 58, R = 48;
  const circ = 2 * Math.PI * R;
  const fill = (circ * Math.min(score, 80) / 80).toFixed(2);
  const gap  = (circ - parseFloat(fill)).toFixed(2);
  const col  = scoreColor(score);
  const val  = (score / 8).toFixed(1).replace(".", ",");
  return `<svg width="116" height="116" viewBox="0 0 116 116" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="rgba(184,149,106,0.10)" stroke-width="5"/>
    <g transform="rotate(-90,${cx},${cy})">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${col}" stroke-width="5.5"
        stroke-dasharray="${fill} ${gap}" stroke-linecap="round"/>
    </g>
    <text x="${cx}" y="${cy + 11}" text-anchor="middle"
      font-family="'Playfair Display',Georgia,serif"
      font-size="33" font-weight="800" fill="${col}">${val}</text>
  </svg>`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,800;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}
html,body{overflow:hidden}
::-webkit-scrollbar{display:none}
body{
  font-family:'Inter',-apple-system,'Helvetica Neue',Arial,sans-serif;
  font-size:16px;line-height:1.55;
  background:#F2EEE7;
  -webkit-print-color-adjust:exact;print-color-adjust:exact;
}
.page{
  width:210mm;height:297mm;overflow:hidden;
  display:flex;flex-direction:column;
  background:#F2EEE7;
  page-break-after:always;
}
.page:last-child{page-break-after:auto}

/* ── HEADER ── */
.hd{
  flex-shrink:0;background:#1E1812;
  padding:7pt 12mm;
  display:flex;align-items:center;justify-content:space-between;
  border-bottom:1.5pt solid #B8956A;
}
.hd-brand{display:flex;align-items:center;gap:10pt}
.hd-logo{
  height:34px;width:auto;max-width:110px;
  object-fit:contain;object-position:left center;
  filter:brightness(0) invert(1) opacity(0.85);
  flex-shrink:0;
}
.hd-sep{width:0.6pt;height:26px;background:rgba(184,149,106,0.45);flex-shrink:0}
.hd-name{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;color:#F0E8DA;letter-spacing:-0.2px}
.hd-contact{font-size:11px;color:#7A6A58;margin-top:1pt;letter-spacing:0.2px}
.hd-right{text-align:right}
.hd-date-lbl{font-size:10.5px;font-weight:700;color:#B8956A;letter-spacing:2px;text-transform:uppercase}
.hd-date-val{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;color:#E8DDD0;display:block;margin-top:1pt}

/* ── HERO page 1 — typographique, sans score ── */
.hero{
  flex-shrink:0;
  background:linear-gradient(120deg,#18120A 0%,#261E12 55%,#1E1610 100%);
  padding:14pt 12mm 12pt;
  border-bottom:0.5pt solid #3A3020;
}
.hero-overline{font-size:11px;font-weight:700;color:#B8956A;letter-spacing:3px;text-transform:uppercase;margin-bottom:6pt}
.hero-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:38px;font-weight:800;color:#F5EFE5;
  line-height:1;letter-spacing:-0.5px;margin-bottom:7pt;
}
.hero-meta{display:flex;align-items:center;gap:11pt}
.hero-meta-item{font-size:13px;color:#7A6A58}
.hero-meta-item strong{color:#C4AA7A;font-weight:600}
.hero-meta-dot{width:3pt;height:3pt;background:rgba(184,149,106,0.4);border-radius:50%;flex-shrink:0}

/* ── SECTION LABEL ── */
.sec{display:flex;align-items:center;gap:7pt;margin-bottom:4pt;flex-shrink:0}
.sec-lbl{font-size:11.5px;font-weight:700;color:#A89070;letter-spacing:2.5px;text-transform:uppercase;white-space:nowrap}
.sec-rule{flex:1;height:0.35pt;background:linear-gradient(90deg,#D4C8B8,transparent)}

/* ── PAGE 1 — 2 colonnes ── */
.p1-body{
  flex:1;min-height:0;overflow:hidden;
  display:flex;padding:5mm 12mm 3mm;gap:0;
}
.p1-left{
  flex:0 0 49%;display:flex;flex-direction:column;
  padding-right:7mm;
}
.p1-vsep{
  width:0.35pt;background:#E4DDD2;flex-shrink:0;
  align-self:stretch;
}
.p1-right{
  flex:1;display:flex;flex-direction:column;
  padding-left:7mm;
}

/* ── SECTION BLOCK — remplace .card pour la plupart des blocs ── */
.sblock{flex-shrink:0;padding-bottom:4mm}
.sblock+.sblock{padding-top:4mm;border-top:0.35pt solid #EDE5DA}

/* ── SCORE PANEL (colonne droite page 1) ── */
.score-panel{
  display:flex;flex-direction:column;align-items:center;
  padding:6pt 0 12pt;gap:3pt;flex-shrink:0;
}
.score-panel+.sblock{padding-top:4mm;border-top:0.35pt solid #EDE5DA}
.score-panel-lbl{font-size:11.5px;font-weight:700;color:#A89070;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:2pt}
.score-panel-status{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700}
.score-panel-interp{font-size:11.5px;color:rgba(184,149,106,0.65);letter-spacing:1px;text-transform:uppercase}

/* ── AXES ── */
.axis-row{display:flex;align-items:center;gap:7pt;padding:4.5pt 0;border-bottom:0.35pt solid #EDE5DA}
.axis-row:last-child{border-bottom:none}
.axis-lbl{font-size:13px;font-weight:600;color:#7A6A58;letter-spacing:0.2px;width:70pt;flex-shrink:0}
.axis-track{flex:1;height:4pt;border-radius:99pt;background:#E8DDD0;overflow:hidden;min-width:20pt}
.axis-fill{height:4pt;border-radius:99pt}
.axis-num{font-family:'Playfair Display',Georgia,serif;font-size:18px;font-weight:700;width:17pt;text-align:right;flex-shrink:0;line-height:1}
.axis-den{font-size:12px;color:#C0B0A0;width:13pt;flex-shrink:0}

/* ── FORCES & PRIORITÉS ── */
.fp-wrap{display:flex;gap:0;align-items:flex-start}
.fp-col{flex:1;min-width:0}
.fp-col:first-child{padding-right:7pt;border-right:0.35pt solid #E4DDD2}
.fp-col:last-child{padding-left:7pt}
.fp-title{font-size:11.5px;font-weight:700;color:#A89070;letter-spacing:2px;text-transform:uppercase;margin-bottom:5pt}
.fp-item{font-size:14.5px;color:#1A1410;font-weight:500;padding:2.5pt 0;display:flex;align-items:center;gap:5pt;line-height:1.35}
.fp-check{color:#2E7D52;font-size:11px;flex-shrink:0}
.fp-dot{color:#C47040;font-size:11px;flex-shrink:0}

/* ── LIMITATIONS ── */
.chips{display:flex;flex-wrap:wrap;gap:0;margin-top:3pt}
.chip{
  font-size:13.5px;font-weight:500;padding:2.5pt 8pt;border-radius:3pt;
  background:#EAE2D4;color:#5A4A38;
  display:inline-block;margin:2pt 2.5pt 0 0;
  border:0.5pt solid #D8CDB8;
}

/* ── COMPENSATION ── */
.comp-warn-pill{
  display:flex;align-items:flex-start;gap:6pt;padding:5pt 0 5pt 9pt;
  border-left:2pt solid #C47040;flex-shrink:0;margin-top:3pt;
}
.comp-warn-icon{font-size:11px;color:#C47040;flex-shrink:0;margin-top:1pt}
.comp-warn-text{font-size:13px;color:#7A5020;line-height:1.45;font-style:italic}

/* ── TESTS (page 1) ── */
.test-row{display:flex;align-items:flex-start;padding:5pt 0;gap:7pt;border-bottom:0.35pt solid #EDE5DA}
.test-row:last-child{border-bottom:none}
.test-bar{width:2.5pt;border-radius:99pt;flex-shrink:0;align-self:stretch;min-height:14px;margin-top:2pt}
.test-body{flex:1;min-width:0}
.test-top{display:flex;align-items:center;justify-content:space-between;gap:5pt;margin-bottom:2pt}
.test-name{font-size:15px;font-weight:600;color:#1A1410;line-height:1.3}
.test-badge{
  font-size:11.5px;font-weight:700;padding:2pt 6pt;border-radius:2pt;
  border-width:0.6pt;border-style:solid;letter-spacing:0.3px;
  text-transform:uppercase;white-space:nowrap;flex-shrink:0;
}
.test-obs{font-size:13.5px;color:#9A8C80;font-style:italic;line-height:1.45}

/* ── RESSENTI ── */
.res-row{display:flex;align-items:center;gap:7pt;padding:4pt 0;border-bottom:0.35pt solid #EDE5DA}
.res-row:last-child{border-bottom:none}
.res-lbl{font-size:13px;font-weight:600;color:#7A6A58;width:52pt;flex-shrink:0}
.res-track{flex:1;height:3pt;border-radius:99pt;background:#E8DDD0;overflow:hidden}
.res-fill{height:3pt;border-radius:99pt}
.res-val{font-family:'Playfair Display',Georgia,serif;font-size:17px;font-weight:700;width:21pt;text-align:right;flex-shrink:0;line-height:1}

/* ── PROGRAMME ── */
.prog-row{display:flex;gap:8pt;align-items:flex-start;padding:4pt 0;border-bottom:0.35pt solid #EDE5DA}
.prog-row:last-child{border-bottom:none}
.prog-num{
  width:16px;height:16px;border-radius:50%;background:#1E1812;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;border:0.6pt solid #B8956A;margin-top:2pt;
}
.prog-num-txt{font-family:'Playfair Display',Georgia,serif;font-size:8px;font-weight:700;color:#E8D5A8}
.prog-step-lbl{font-size:12px;font-weight:700;color:#B8956A;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:1pt}
.prog-name{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;color:#1A1410;line-height:1.2}
.freq-pill{
  display:flex;align-items:center;gap:8pt;background:#1E1812;border-radius:4pt;
  padding:5pt 10pt;margin-top:6pt;border-left:2.5pt solid #B8956A;flex-shrink:0;
}
.freq-lbl{font-size:11.5px;font-weight:700;color:#B8956A;letter-spacing:1.2px;text-transform:uppercase}
.freq-val{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;color:#F5EFE5}

/* ── FOOTER ── */
.footer{
  flex-shrink:0;background:#FDFCF9;height:7mm;display:flex;align-items:center;
  justify-content:space-between;padding:0 12mm;border-top:0.5pt solid #DDD5C8;
}
.footer-centered{
  flex-shrink:0;background:#FDFCF9;height:7mm;display:flex;align-items:center;
  justify-content:center;gap:8pt;padding:0 12mm;border-top:0.5pt solid #DDD5C8;
}
.footer-txt{font-size:12.5px;color:#B8A898;letter-spacing:0.2px}
.footer-dot{font-size:5px;color:#C4A87A}

/* ── MINI HEADER pages 2 & 3 ── */
.mini-hd{
  flex-shrink:0;background:#1E1812;height:9.5mm;display:flex;align-items:center;
  justify-content:space-between;padding:0 12mm;
  border-bottom:0.7pt solid rgba(184,149,106,0.3);
}
.mini-left{display:flex;align-items:center;gap:7pt}
.mini-dia{width:4pt;height:4pt;background:#B8956A;transform:rotate(45deg);flex-shrink:0}
.mini-client{font-family:'Playfair Display',Georgia,serif;font-size:14px;font-weight:700;color:#F5EFE5}
.mini-sub{font-size:12.5px;color:#5A4A38}
.mini-pg{font-size:12.5px;color:#5A4A38}

/* ── PAGE 2 LAYOUT ── */
.p2-body{
  flex:1;display:flex;flex-direction:column;
  padding:4mm 12mm 4mm;gap:1.5mm;min-height:0;overflow:hidden;
}
.p2-upper{display:flex;gap:0;align-items:stretch;flex-shrink:0}
.p2-obs-col{flex:0 0 56%;padding-right:7mm;display:flex;flex-direction:column}
.p2-vsep{width:0.35pt;background:#E4DDD2;flex-shrink:0;align-self:stretch}
.p2-side-col{flex:1;padding-left:7mm;display:flex;flex-direction:column;gap:3.5mm}
.p2-radar{flex-shrink:0;display:flex;justify-content:center}

/* ── OBSERVATIONS (page 2) ── */
.obs{
  padding:7pt 12pt 7pt 14pt;border-left:3pt solid #B8956A;
  background:#FDFCF9;border-radius:0 6pt 6pt 0;flex:1;
}
.obs-text{
  font-family:'Playfair Display',Georgia,serif;font-size:20px;font-style:italic;
  color:#1E1610;line-height:1.72;margin-bottom:5pt;
}
.obs-sub{font-size:16.5px;color:#7A6A5E;line-height:1.65}

/* ── OBJECTIF PROCHAIN BILAN ── */
.nb{
  background:#1E1812;border-radius:5pt;padding:7pt 10pt;
  border-left:3pt solid #B8956A;flex-shrink:0;
  border-top:0.5pt solid rgba(184,149,106,0.2);
  border-right:0.5pt solid rgba(184,149,106,0.2);
  border-bottom:0.5pt solid rgba(184,149,106,0.2);
}
.nb .sec-lbl{color:rgba(184,149,106,0.85)}
.nb .sec-rule{background:linear-gradient(90deg,rgba(184,149,106,0.4),transparent)}
.nb-row{display:flex;align-items:center;margin-top:5pt}
.nb-col{display:flex;flex-direction:column;align-items:center;flex:1}
.nb-lbl{font-size:11px;font-weight:700;color:rgba(184,149,106,0.65);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3pt;text-align:center}
.nb-score{font-family:'Playfair Display',Georgia,serif;font-size:27px;font-weight:800;line-height:1;text-align:center}
.nb-unit{font-size:12px;color:rgba(184,149,106,0.5);margin-left:1pt;font-weight:400}
.nb-delay{font-family:'Playfair Display',Georgia,serif;font-size:13px;font-weight:700;color:#E8DDD0;text-align:center;line-height:1.3}
.nb-arrow{font-size:14px;color:#B8956A;padding:0 5pt;flex-shrink:0}
.nb-sep{width:0.5pt;height:22px;background:rgba(184,149,106,0.35);flex-shrink:0;margin:0 7pt}

/* ── TESTS TABLE (page 2) ── */
.ttest-row{
  display:flex;align-items:center;justify-content:space-between;
  padding:4.5pt 0;border-bottom:0.35pt solid #EDE5DA;gap:8pt;
}
.ttest-row:last-child{border-bottom:none}
.ttest-name{font-size:15px;font-weight:500;color:#1A1410;flex:1;min-width:0}
.ttest-badge{
  font-size:12.5px;font-weight:700;padding:2.5pt 7pt;border-radius:2pt;
  border-width:0.6pt;border-style:solid;white-space:nowrap;flex-shrink:0;letter-spacing:0.2px;
}

/* ── ZONES (page 2) ── */
.z-chips{display:flex;flex-wrap:wrap;margin-top:4pt}
.z-chip{
  font-size:14px;font-weight:500;padding:3pt 9pt;border-radius:3pt;
  border-width:0.6pt;border-style:solid;display:inline-block;margin:2pt 2.5pt 0 0;
}
.z-forte{color:#8A2020;background:#F5E0E0;border-color:#D88080}
.z-surv{color:#7A4010;background:#F5E8D8;border-color:#D8A870}

/* ── RADAR (page 2) ── */
.card{
  background:#FDFCF9;border-radius:7pt;padding:8pt 11pt;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 3pt 10pt rgba(30,24,18,0.05);
  border:0.5pt solid rgba(184,149,106,0.09);flex-shrink:0;
}
.radar-zone{
  width:100%;box-sizing:border-box;
  background:rgba(212,200,178,0.10);
  border-radius:5pt;
  border:0.4pt solid rgba(184,149,106,0.14);
  padding:5pt 14pt 3pt;
}

/* ── PAGE 3 LAYOUT ── */
.p3-body{
  flex:1;display:flex;flex-direction:column;
  padding:4mm 12mm 2mm;gap:3.5mm;min-height:0;overflow:hidden;
}
.p3-section{flex-shrink:0}

/* ── COMPOSITION ÉDITORIALE (page 3) ── */
.comp-editorial{
  display:flex;align-items:stretch;margin-top:4pt;
}
.comp-stat{
  flex:1;text-align:center;padding:0 8pt;
  border-right:0.35pt solid #E4DDD2;
}
.comp-stat:first-child{padding-left:0}
.comp-stat:last-child{border-right:none;padding-right:0}
.comp-stat-v{
  font-family:'Playfair Display',Georgia,serif;
  font-size:23px;font-weight:700;color:#1A1410;line-height:1;
}
.comp-stat-u{font-size:13px;color:#9A8C80;margin-left:1pt;font-weight:400}
.comp-stat-k{
  font-size:10px;font-weight:600;color:#A89070;
  letter-spacing:1px;text-transform:uppercase;margin-top:3pt;
}

/* ── SEGMENTAIRE MUSCULAIRE (page 3) ── */
.seg-sub-hd{display:flex;align-items:center;gap:6pt;margin:4pt 0 3pt;flex-shrink:0}
.seg-sub-lbl{font-size:9.5px;font-weight:700;color:#C0B0A0;letter-spacing:2px;text-transform:uppercase;white-space:nowrap}
.seg-sub-rule{flex:1;height:0.3pt;background:linear-gradient(90deg,#DDD5C8,transparent)}
.seg-row{display:flex;align-items:stretch}
.seg-stat{flex:1;text-align:center;padding:0 5pt;border-right:0.35pt solid #E4DDD2}
.seg-stat:first-child{padding-left:0}
.seg-stat:last-child{border-right:none;padding-right:0}
.seg-stat-v{font-family:'Playfair Display',Georgia,serif;font-size:21px;font-weight:700;color:#3A2E24;line-height:1}
.seg-stat-u{font-size:11px;color:#9A8C80;font-weight:400;margin-left:1pt}
.seg-stat-k{font-size:9.5px;font-weight:600;color:#B8A898;letter-spacing:0.8px;text-transform:uppercase;margin-top:3pt}

/* ── RECOMMANDATIONS COACH (page 3) ── */
.rec-chips{display:flex;flex-wrap:wrap;margin-top:2pt}
.rec-chip{
  font-size:13px;font-weight:500;padding:2.5pt 8pt;border-radius:3pt;
  border:0.5pt solid #D4C4AC;background:#EDE3D0;color:#4A3C30;
  display:inline-block;margin:2pt 3pt 0 0;
}
.rec-freq{
  display:flex;align-items:center;gap:6pt;margin-top:4pt;
  padding-top:4pt;border-top:0.35pt solid #EDE5DA;
}
.rec-freq-lbl{font-size:11px;font-weight:700;color:#A89070;letter-spacing:2px;text-transform:uppercase}
.rec-freq-val{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:700;color:#1A1410}
.rec-action{
  font-size:14px;font-weight:500;color:#5A4A38;line-height:1.5;margin-top:4pt;
  padding:5pt 10pt;background:transparent;
  border-left:2pt solid #B8956A;
}
.rec-detail{
  font-size:14px;color:#3E3028;line-height:1.55;margin-top:4pt;
  font-style:italic;padding-top:5pt;border-top:0.35pt solid #EDE5DA;
}

/* ── PROJECTION ÉDITORIALE (page 3) ── */
.proj-editorial{
  background:#1E1812;border-radius:6pt;
  padding:12pt 14pt 14pt;
  border-left:3pt solid #B8956A;
  border-top:0.5pt solid rgba(184,149,106,0.2);
  border-right:0.5pt solid rgba(184,149,106,0.2);
  border-bottom:0.5pt solid rgba(184,149,106,0.2);
  flex-shrink:0;
}
.proj-editorial .sec-lbl{color:rgba(184,149,106,0.85)}
.proj-editorial .sec-rule{background:linear-gradient(90deg,rgba(184,149,106,0.4),transparent)}
.proj-ed-steps{display:flex;align-items:stretch;margin-top:10pt;gap:0}
.proj-ed-step{
  flex:1;padding:0 14pt;
  border-right:0.5pt solid rgba(184,149,106,0.18);
}
.proj-ed-step:first-child{padding-left:0}
.proj-ed-step:last-child{border-right:none;padding-right:0}
.proj-ed-num{
  width:22px;height:22px;border-radius:50%;
  background:rgba(184,149,106,0.12);
  font-family:'Playfair Display',Georgia,serif;font-size:10px;font-weight:700;color:#C4A87A;
  display:flex;align-items:center;justify-content:center;
  margin-bottom:7pt;border:0.6pt solid rgba(184,149,106,0.35);
}
.proj-ed-week{
  font-size:11px;font-weight:700;color:rgba(184,149,106,0.65);
  letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4pt;
}
.proj-ed-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:17px;font-weight:700;color:#F5EFE5;
  margin-bottom:5pt;line-height:1.2;
}
.proj-ed-desc{font-size:14px;color:#9A8878;line-height:1.5}

/* ── PROFIL NIVEAU (remplace score panel) ── */
.profile-level{
  display:flex;flex-direction:column;align-items:center;
  padding:8pt 0 14pt;gap:4pt;flex-shrink:0;
}
.profile-level+.sblock{padding-top:4mm;border-top:0.35pt solid #EDE5DA}
.profile-level-lbl{font-size:11.5px;font-weight:700;color:#A89070;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:2pt}
.profile-level-badge{
  font-family:'Playfair Display',Georgia,serif;
  font-size:26px;font-weight:700;letter-spacing:0.5px;
  line-height:1.1;text-align:center;margin-bottom:2pt;
}
.profile-level-desc{
  font-size:13px;color:#9A8880;line-height:1.55;text-align:center;
  max-width:120pt;font-style:italic;
}

/* ── INTERPRÉTATION AXE ── */
.axis-interp{
  font-size:10.5px;font-weight:700;letter-spacing:0.3px;text-transform:uppercase;
  width:62pt;text-align:right;flex-shrink:0;
}

/* ── FEUILLE DE ROUTE (page 3, élément principal) ── */
.roadmap{
  background:#FDFCF9;
  border-radius:8pt;
  padding:10pt 14pt 12pt;
  border:0.5pt solid rgba(184,149,106,0.28);
  border-left:2.5pt solid #B8956A;
  flex-shrink:0;
}
.roadmap-meta{
  display:flex;gap:0;padding:6pt 0;
  border-bottom:0.4pt solid rgba(184,149,106,0.2);
}
.roadmap-meta-item{flex:1;padding:0 12pt}
.roadmap-meta-item:first-child{padding-left:0}
.roadmap-meta-item+.roadmap-meta-item{border-left:0.4pt solid rgba(184,149,106,0.2)}
.roadmap-meta-lbl{font-size:9px;font-weight:700;color:#A89070;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2pt}
.roadmap-meta-val{font-family:'Playfair Display',Georgia,serif;font-size:16px;font-weight:700;color:#1A1410;line-height:1.25}
.roadmap-proj{padding:6pt 0;border-bottom:0.4pt solid rgba(184,149,106,0.2)}
.roadmap-proj-lbl{font-size:9px;font-weight:700;color:#A89070;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4pt}
.roadmap-bullets{display:flex;flex-direction:column}
.roadmap-bullet{display:flex;align-items:baseline;gap:6pt;padding:2pt 0}
.roadmap-bullet-dot{font-size:5.5px;color:#B8956A;flex-shrink:0;line-height:1}
.roadmap-bullet-text{font-size:13px;color:#3E3028;line-height:1.45}
.roadmap-action{padding-top:6pt}
.roadmap-action-lbl{font-size:9px;font-weight:700;color:#A89070;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2pt}
.roadmap-action-val{
  font-size:13px;font-weight:500;color:#5A4A38;line-height:1.45;font-style:italic;
  padding:4pt 0 2pt 10pt;border-left:2pt solid rgba(184,149,106,0.4);
}

/* ── POURQUOI CES AXES (page 3) ── */
.why-grid{display:flex;gap:8pt;margin-top:4pt}
.why-item{
  flex:1;padding:5pt 9pt;
  background:rgba(245,239,229,0.5);border-radius:5pt;
  border:0.4pt solid #E4DDD2;
}
.why-item-label{font-size:10.5px;font-weight:700;color:#B8956A;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:3pt}
.why-item-text{font-size:13px;color:#4A3C30;line-height:1.5}

/* ── CLOSING (page 3) ── */
.closing{padding:2pt 12mm 2pt;text-align:center;flex-shrink:0}
.closing-rule{display:flex;align-items:center;margin-bottom:5pt}
.closing-line{flex:1;height:0.4pt;background:linear-gradient(90deg,transparent,#DDD5C8 30%,#DDD5C8 70%,transparent)}
.closing-dia{width:4pt;height:4pt;background:#B8956A;transform:rotate(45deg);margin:0 8pt;flex-shrink:0}
.closing-name{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;color:#1A1410}
.closing-sub{font-size:13px;color:#9A8C80;margin-top:2pt}
.closing-contact{font-size:13px;color:#B8A898;margin-top:1pt}
.closing-conf{font-size:11.5px;color:#C4B8A8;letter-spacing:0.5px;text-transform:uppercase;margin-top:2pt}

/* ── TRAJECTOIRE (page 3) ── */
.traj-timeline{display:flex;flex-direction:column;margin-top:6pt}
.traj-item{display:flex;gap:10pt}
.traj-left{display:flex;flex-direction:column;align-items:center;width:10pt;flex-shrink:0}
.traj-dot{
  width:9pt;height:9pt;border-radius:50%;
  background:#F5EFE5;border:0.8pt solid #C4A87A;
  flex-shrink:0;margin-top:1pt;
}
.traj-vline{flex:1;width:0.5pt;background:#DDD5C8;min-height:8pt;margin:2pt 0}
.traj-right{padding-bottom:8pt}
.traj-label{
  font-size:10.5px;font-weight:700;color:#B8956A;
  letter-spacing:1.5px;text-transform:uppercase;margin-bottom:1.5pt;
}
.traj-desc{font-size:13px;color:#5A4A3A;line-height:1.45}

/* ── CITATION PREMIUM (page 3) ── */
.p3-quote-wrap{
  display:flex;flex-direction:column;align-items:center;
  gap:9pt;flex-shrink:0;padding:4pt 0;
}
.p3-hr{
  width:40%;height:0.4pt;
  background:linear-gradient(90deg,transparent,#DDD5C8 30%,#DDD5C8 70%,transparent);
}
.p3-quote{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;font-weight:400;font-style:italic;
  color:#B0A090;line-height:1.70;text-align:center;max-width:78%;
}

/* ── PAGE 4 : CARTOGRAPHIE CORPORELLE ── */
.p4-body{
  flex:1;display:flex;flex-direction:column;
  padding:5mm 14mm 4mm;gap:3mm;min-height:0;overflow:hidden;
}
.p4-subtitle{
  font-size:11.5px;color:#8A7A6A;margin:2pt 0 0;line-height:1.55;font-style:italic;
}
.p4-bodymap{display:flex;justify-content:center;flex-shrink:0;}
.p4-bodymap-wrap{position:relative;display:inline-block;line-height:0;}
.p4-bodymap-img{height:122mm;width:auto;display:block;}
.p4-bodymap-svg{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;}
.p4-legend{
  display:flex;justify-content:center;gap:20pt;flex-shrink:0;
  padding:5pt 0;
  border-top:0.5pt solid rgba(184,149,106,0.22);
  border-bottom:0.5pt solid rgba(184,149,106,0.22);
}
.p4-legend-item{display:flex;align-items:flex-start;gap:7pt}
.p4-legend-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:2pt}
.p4-legend-item-txt{display:flex;flex-direction:column;gap:1.5pt}
.p4-legend-name{font-size:11.5px;color:#5A4A3A;font-weight:500}
.p4-legend-count{font-size:9.5px;color:#A89070;font-style:italic}
.p4-info{display:flex;gap:4mm;flex:0 0 auto;align-items:flex-start}
.p4-analyse{
  flex:1;background:#FDFCF9;border-radius:6pt;
  padding:9pt 12pt;border:0.5pt solid rgba(184,149,106,0.2);
  border-left:2.5pt solid #B8956A;overflow:hidden;
}
.p4-analyse-lbl{
  font-size:9.5px;font-weight:700;color:#A89070;
  letter-spacing:2px;text-transform:uppercase;margin-bottom:4pt;
}
.p4-analyse-txt{font-size:12.5px;color:#3E3028;line-height:1.65}
.p4-axes{
  flex:0 0 auto;width:58mm;background:#F7F2EA;border-radius:6pt;
  padding:9pt 12pt;border:0.5pt solid #EDE5DA;overflow:hidden;
}
.p4-axes-lbl{
  font-size:9.5px;font-weight:700;color:#A89070;
  letter-spacing:2px;text-transform:uppercase;margin-bottom:4pt;
}
.p4-axes-list{display:flex;flex-direction:column;gap:3pt}
.p4-axes-item{
  font-size:12px;color:#4A3C30;line-height:1.35;
  display:flex;align-items:flex-start;gap:5pt;
}
.p4-axes-dot{font-size:5px;color:#B8956A;flex-shrink:0;margin-top:3pt}
`;

// ─── SVG : radar pentagone ────────────────────────────────────────────────────

const ABBREVS: Record<string, string> = {
  "mobilité": "MOB.", "stabilité": "STAB.",
  "posture": "POST.", "coordination": "COORD",
};

function radarSvg(axes: BilanPdfData["axes"], displaySize = 340): string {
  const N = axes?.length;
  if (!N) return "";

  const VW = 370, VH = 370;
  const cx = 185, cy = 185, R = 105;
  const labelR = 126;

  const ang = (i: number) => -Math.PI / 10 + (2 * Math.PI * i / N);
  const ptX = (r: number, i: number) => cx + r * Math.cos(ang(i));
  const ptY = (r: number, i: number) => cy + r * Math.sin(ang(i));
  const fmt = (n: number) => n.toFixed(1);

  const grid = [0.25, 0.5, 0.75, 1.0].map(lvl => {
    const pts = Array.from({ length: N }, (_, i) =>
      `${fmt(ptX(R * lvl, i))},${fmt(ptY(R * lvl, i))}`
    ).join(" ");
    const outer = lvl === 1.0;
    return `<polygon points="${pts}" fill="${outer ? "rgba(242,238,231,0.55)" : "none"}"
      stroke="${outer ? "rgba(184,149,106,0.50)" : "rgba(184,149,106,0.22)"}"
      stroke-width="${outer ? "0.9" : "0.55"}"/>`;
  }).join("");

  const spokes = Array.from({ length: N }, (_, i) =>
    `<line x1="${cx}" y1="${cy}" x2="${fmt(ptX(R, i))}" y2="${fmt(ptY(R, i))}"
      stroke="rgba(184,149,106,0.25)" stroke-width="0.55"/>`
  ).join("");

  const dataPts = axes.map((a, i) => {
    const v = a.max > 0 ? a.value / a.max : 0;
    return `${fmt(ptX(R * v, i))},${fmt(ptY(R * v, i))}`;
  }).join(" ");

  const labels = axes.map((a, i) => {
    const cosA = Math.cos(ang(i));
    const sinA = Math.sin(ang(i));
    const lx   = fmt(cx + labelR * cosA);
    const lyRaw = cy + labelR * sinA;
    const anchor = cosA > 0.2 ? "start" : cosA < -0.2 ? "end" : "middle";

    let nameY: number;
    if      (sinA > 0.4)  nameY = lyRaw + 13;
    else if (sinA < -0.4) nameY = lyRaw - 3;
    else                  nameY = lyRaw + 5;

    const scoreY = nameY + 20;

    return `<text x="${lx}" y="${fmt(nameY)}" text-anchor="${anchor}"
      font-family="'Inter',sans-serif" font-size="13" font-weight="600" fill="#8A7A6A" style="letter-spacing:0.4px">${esc(a.label)}</text>
<text x="${lx}" y="${fmt(scoreY)}" text-anchor="${anchor}"
      font-family="'Playfair Display',Georgia,serif" font-size="14" font-weight="700" fill="#C4A87A">${a.value}<tspan font-family="'Inter',sans-serif" font-size="10" font-weight="400" fill="rgba(184,149,106,0.55)"> /${a.max}</tspan></text>`;
  }).join("");

  return `<svg width="${displaySize}" height="${displaySize}" viewBox="0 0 ${VW} ${VH}"
    xmlns="http://www.w3.org/2000/svg">
  ${grid}
  ${spokes}
  <polygon points="${dataPts}" fill="rgba(184,149,106,0.16)" stroke="#B8956A"
    stroke-width="1.7" stroke-linejoin="round"/>
  ${labels}
</svg>`;
}

// ─── Header ───────────────────────────────────────────────────────────────────

function renderHeader(d: BilanPdfData): string {
  const contact = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");
  const logoHtml = `<img class="hd-logo" src="${esc(d.logoSrc)}" alt=""
    onerror="this.style.display='none'">`;
  return `<div class="hd">
    <div class="hd-brand">
      ${logoHtml}
      <div class="hd-sep"></div>
      <div>
        <div class="hd-name">${esc(d.cabinetName)}</div>
        ${contact ? `<div class="hd-contact">${esc(contact)}</div>` : ""}
      </div>
    </div>
    <div class="hd-right">
      <span class="hd-date-lbl">Bilan du</span>
      <span class="hd-date-val">${esc(d.dateStr)}</span>
    </div>
  </div>`;
}

// ─── Hero (page 1) — typographique, sans score ────────────────────────────────

function renderHero(d: BilanPdfData, name: string): string {
  const sexeLabel = d.sexe === "femme" ? "Femme" : d.sexe === "homme" ? "Homme" : null;
  const identityParts: string[] = [];
  if (sexeLabel)    identityParts.push(`<strong>${esc(sexeLabel)}</strong>`);
  if (d.age != null) identityParts.push(`<strong>${d.age}</strong>&nbsp;ans`);
  identityParts.push(esc(d.dateStr));

  return `<div class="hero">
    <div class="hero-overline">Bilan mouvement personnalisé</div>
    <div class="hero-name">${esc(name)}</div>
    <div class="hero-meta">
      ${identityParts.map((p, i) =>
        (i > 0 ? `<div class="hero-meta-dot"></div>` : "") +
        `<span class="hero-meta-item">${p}</span>`
      ).join("")}
    </div>
    <div class="hero-meta" style="margin-top:4pt">
      <span class="hero-meta-item">Coach&nbsp;: <strong>${esc(d.coachName || "Non renseigné")}</strong></span>
      ${d.engagement ? `<div class="hero-meta-dot"></div><span class="hero-meta-item" style="font-style:italic">${esc(d.engagement)}</span>` : ""}
    </div>
  </div>`;
}

// ─── Profil niveau (colonne droite page 1, remplace score panel) ─────────────

function renderProfileLevel(total: number): string {
  const level = profileLevel(total);
  return `<div class="profile-level">
    <div class="profile-level-lbl">Profil actuel</div>
    <div class="profile-level-badge" style="color:${level.color}">${esc(level.label.toUpperCase())}</div>
    <div class="profile-level-desc">${esc(level.desc)}</div>
  </div>`;
}

// ─── Axes ─────────────────────────────────────────────────────────────────────

function renderAxes(axes: BilanPdfData["axes"]): string {
  if (!axes?.length) return "";
  const rows = axes.map(a => {
    const pct = a.max > 0 ? (a.value / a.max) * 100 : 0;
    const col = barColor(pct);
    const interp = axisInterp(a.value);
    return `<div class="axis-row">
      <span class="axis-lbl">${esc(a.label)}</span>
      <div class="axis-track"><div class="axis-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div></div>
      <span class="axis-num" style="color:${col}">${a.value}</span>
      <span class="axis-den">/${a.max}</span>
      <span class="axis-interp" style="color:${interp.color}">${esc(interp.label)}</span>
    </div>`;
  }).join("");
  return `<div class="sblock">
    ${sec("Évaluation des 5 axes")}
    ${rows}
  </div>`;
}

// ─── Radar ────────────────────────────────────────────────────────────────────

function renderBigRadar(axes: BilanPdfData["axes"]): string {
  if (!axes?.length) return "";
  return `<div class="radar-zone">
    ${sec("Cartographie du mouvement")}
    <div style="display:flex;justify-content:center;align-items:center;padding:4pt 0 3pt">
      ${radarSvg(axes, 465)}
    </div>
  </div>`;
}

// ─── Forces & Priorités ───────────────────────────────────────────────────────

function renderForcesAndPriorities(axes: BilanPdfData["axes"]): string {
  if (!axes?.length) return "";
  const sorted = [...axes].sort((a, b) => {
    const pA = a.max > 0 ? a.value / a.max : 0;
    const pB = b.max > 0 ? b.value / b.max : 0;
    return pB - pA;
  });
  const top = sorted.slice(0, 2);
  const bot = sorted.slice(-2).reverse();

  const strongItems = top.map(a =>
    `<div class="fp-item"><span class="fp-check">✓</span>${esc(a.label)}</div>`
  ).join("");
  const weakItems = bot.map(a =>
    `<div class="fp-item"><span class="fp-dot">•</span>${esc(a.label)}</div>`
  ).join("");

  return `<div class="sblock">
    <div class="fp-wrap">
      <div class="fp-col">
        <div class="fp-title">Points forts</div>
        ${strongItems}
      </div>
      <div class="fp-col">
        <div class="fp-title">Priorités</div>
        ${weakItems}
      </div>
    </div>
  </div>`;
}

// ─── Pourquoi travailler ces axes (page 3) ───────────────────────────────────

function renderWhyAxes(axes: BilanPdfData["axes"]): string {
  if (!axes?.length) return "";
  const weakAxes = [...axes]
    .filter(a => a.max > 0 && a.value / a.max < 0.65)
    .sort((a, b) => (a.value / a.max) - (b.value / b.max))
    .slice(0, 2);
  if (!weakAxes.length) return "";

  const items = weakAxes.map(a => {
    const text = WHY_AXES_TEXT[a.label.toLowerCase()];
    if (!text) return "";
    return `<div class="why-item">
      <div class="why-item-label">${esc(a.label)}</div>
      <div class="why-item-text">${esc(text)}</div>
    </div>`;
  }).filter(Boolean).join("");

  if (!items) return "";
  return `<div class="p3-section">
    ${sec("Pourquoi travailler ces axes ?")}
    <div class="why-grid">${items}</div>
  </div>`;
}

// ─── Feuille de route personnalisée (page 3, élément principal) ───────────────

function renderRoadmap(d: BilanPdfData): string {
  const { mainGoal, frequency, nextAction, axes, topPriorities, importantNotes, painEvolution } = d;

  const sortedAxes = [...(axes ?? [])].sort((a, b) => (a.value / a.max) - (b.value / b.max));
  const weakAxes   = sortedAxes.filter(a => a.max > 0 && a.value / a.max < 0.75);
  const priorityAxis = weakAxes[0] ?? sortedAxes[0] ?? null;

  if (!priorityAxis && !frequency && !nextAction && !mainGoal) return "";

  // Ligne méta compacte : axe + fréquence (+ objectif si court)
  const metaItems: Array<{ lbl: string; val: string }> = [];
  if (priorityAxis) metaItems.push({ lbl: "Axe prioritaire", val: priorityAxis.label });
  if (frequency)    metaItems.push({ lbl: "Fréquence",        val: frequency          });
  if (mainGoal && metaItems.length < 3) metaItems.push({ lbl: "Objectif", val: mainGoal });

  const metaHtml = metaItems.length
    ? `<div class="roadmap-meta">${metaItems.map(it =>
        `<div class="roadmap-meta-item">
          <div class="roadmap-meta-lbl">${esc(it.lbl)}</div>
          <div class="roadmap-meta-val">${esc(it.val)}</div>
        </div>`).join("")}</div>`
    : "";

  // Bullets de projection depuis les axes faibles
  const bullets: string[] = [];
  weakAxes.slice(0, 3).forEach(a => {
    const p = AXIS_PROJECTIONS[a.label.toLowerCase()];
    if (p) bullets.push(p);
  });
  if (bullets.length < 2) {
    (topPriorities ?? []).forEach(p => {
      if (bullets.length < 3 && !bullets.includes(p)) bullets.push(p);
    });
  }
  if (bullets.length === 0) {
    bullets.push("Phase d'activation et prise de repères corporels");
    bullets.push("Progression régulière et consolidation des acquis");
  }

  const bulletHtml = bullets.slice(0, 3).map(b =>
    `<div class="roadmap-bullet"><span class="roadmap-bullet-dot">◆</span><span class="roadmap-bullet-text">${esc(b)}</span></div>`
  ).join("");

  const projHtml = `<div class="roadmap-proj">
    <div class="roadmap-proj-lbl">Projection à 6 semaines</div>
    <div class="roadmap-bullets">${bulletHtml}</div>
  </div>`;

  const actionHtml = nextAction
    ? `<div class="roadmap-action">
        <div class="roadmap-action-lbl">Prochaine étape</div>
        <div class="roadmap-action-val">${esc(nextAction)}</div>
      </div>`
    : "";

  const importantNotesHtml = importantNotes
    ? `<div class="roadmap-action" style="margin-top:5pt;padding-top:5pt;border-top:0.4pt solid rgba(184,149,106,0.2)">
        <div class="roadmap-action-lbl">Notes importantes</div>
        <div class="roadmap-action-val">${esc(importantNotes)}</div>
      </div>`
    : "";

  const painEvolutionHtml = painEvolution
    ? `<div class="roadmap-action" style="margin-top:5pt;padding-top:5pt;border-top:0.4pt solid rgba(184,149,106,0.2)">
        <div class="roadmap-action-lbl">Évolution des douleurs</div>
        <div class="roadmap-action-val">${esc(painEvolution)}</div>
      </div>`
    : "";

  return `<div class="roadmap">
    ${sec("Votre feuille de route")}
    ${metaHtml}
    ${projHtml}
    ${actionHtml}
    ${importantNotesHtml}
    ${painEvolutionHtml}
  </div>`;
}

// ─── Ressenti subjectif ───────────────────────────────────────────────────────

function renderRessenti(d: BilanPdfData): string {
  const items: Array<{ lbl: string; val: number | null }> = [
    { lbl: "Énergie",  val: d.energyScore },
    { lbl: "Stress",   val: d.stressScore },
    { lbl: "Sommeil",  val: d.sleepScore  },
    { lbl: "Douleur",  val: d.painScore   },
  ];
  const present = items.filter(it => it.val !== null);
  if (!present.length) return "";

  const rows = present.map(it => {
    const v   = it.val!;
    const pct = v * 10;
    const col = it.lbl === "Stress" || it.lbl === "Douleur"
      ? barColor(100 - pct)
      : barColor(pct);
    return `<div class="res-row">
      <span class="res-lbl">${esc(it.lbl)}</span>
      <div class="res-track"><div class="res-fill" style="width:${pct}%;background:${col}"></div></div>
      <span class="res-val" style="color:${col}">${v}</span>
    </div>`;
  }).join("");

  return `<div class="sblock">
    ${sec("Ressenti subjectif")}
    ${rows}
  </div>`;
}

// ─── Limitations ─────────────────────────────────────────────────────────────

function renderLimitations(lim: string[]): string {
  if (!lim?.length) return "";
  const chips = lim.map(l => `<span class="chip">${esc(l)}</span>`).join("");
  return `<div class="sblock">
    ${sec("Limitations quotidiennes")}
    <div class="chips">${chips}</div>
  </div>`;
}

// ─── Tests de mouvement (page 1) ──────────────────────────────────────────────

function renderTests(tests: BilanPdfData["tests"]): string {
  if (!tests?.length) return "";
  const CFG = {
    0: { label: "DOULEUR",      bg: "#FEF4F4", border: "#F0C0C0", text: "#8A2828", bar: "#C44444" },
    1: { label: "OBSERVATION",  bg: "#FDF9F2", border: "#E8CFA0", text: "#7A5020", bar: "#C47040" },
    2: { label: "OPTIMAL",      bg: "#F2FBF6", border: "#A4DEBA", text: "#1A5C38", bar: "#2E7D52" },
  } as const;

  const rows = tests.map(t => {
    const cfg = CFG[t.score] ?? CFG[1];
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

  return `<div class="sblock">
    ${sec("Tests de mouvement")}
    ${rows}
  </div>`;
}

// ─── Tests table (page 2) ────────────────────────────────────────────────────

function renderTestsTable(tests: BilanPdfData["tests"]): string {
  if (!tests?.length) return "";
  const CFG = {
    0: { label: "Douleur",      bg: "#FEF4F4", border: "#F0C0C0", text: "#8A2828" },
    1: { label: "À surveiller", bg: "#FDF9F2", border: "#E8CFA0", text: "#7A5020" },
    2: { label: "Optimal",      bg: "#F2FBF6", border: "#A4DEBA", text: "#1A5C38" },
  } as const;

  const rows = tests.map(t => {
    const cfg = CFG[t.score] ?? CFG[1];
    return `<div class="ttest-row">
      <span class="ttest-name">${esc(t.label)}</span>
      <span class="ttest-badge" style="background:${cfg.bg};border-color:${cfg.border};color:${cfg.text}">${cfg.label}</span>
    </div>`;
  }).join("");

  return `<div class="card">
    ${sec("Détail des tests")}
    ${rows}
  </div>`;
}

// ─── Programme recommandé ─────────────────────────────────────────────────────

function renderProgramme(priorities: string[], frequency: string | null): string {
  const steps = [
    priorities?.[0] ? { n: "1", lbl: "Maintenant", name: priorities[0] } : null,
    priorities?.[1] ? { n: "2", lbl: "Ensuite",    name: priorities[1] } : null,
    priorities?.[2] ? { n: "3", lbl: "Puis",       name: priorities[2] } : null,
  ].filter(Boolean) as Array<{ n: string; lbl: string; name: string }>;

  if (!steps.length && !frequency) return "";

  const rows = steps.map(s => `<div class="prog-row">
    <div class="prog-num"><span class="prog-num-txt">${s.n}</span></div>
    <div>
      <div class="prog-step-lbl">${esc(s.lbl)}</div>
      <div class="prog-name">${esc(s.name)}</div>
    </div>
  </div>`).join("");

  const freqHtml = frequency ? `<div class="freq-pill">
    <span class="freq-lbl">Fréquence</span>
    <span class="freq-val">${esc(frequency)}</span>
  </div>` : "";

  return `<div class="sblock">
    ${sec("Programme recommandé")}
    ${rows}
    ${freqHtml}
  </div>`;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function renderFooter(cabinet: string, right: string): string {
  return `<div class="footer">
    <span class="footer-txt">${esc(cabinet)}</span>
    <span class="footer-dot">◆</span>
    <span class="footer-txt">${esc(right)}</span>
  </div>`;
}

function renderFooter2(cabinet: string, pageLabel: string): string {
  return `<div class="footer-centered">
    <span class="footer-txt">${esc(cabinet)}</span>
    <span class="footer-dot">◆</span>
    <span class="footer-txt">Rapport confidentiel</span>
    <span class="footer-dot">◆</span>
    <span class="footer-txt">${esc(pageLabel)}</span>
  </div>`;
}

// ─── Mini header (pages 2 & 3) ───────────────────────────────────────────────

function renderMiniHeader(name: string, dateStr: string, pageLabel: string): string {
  return `<div class="mini-hd">
    <div class="mini-left">
      <div class="mini-dia"></div>
      <span class="mini-client">${esc(name)}</span>
      <span class="mini-sub">· Feuille de route</span>
    </div>
    <span class="mini-pg">${esc(dateStr)} · Page ${esc(pageLabel)}</span>
  </div>`;
}

// ─── Observations (page 2) ───────────────────────────────────────────────────

function renderObservations(d: BilanPdfData): string {
  const axes   = d.axes ?? [];
  const scored = axes.map(a => ({
    n: a.label.toLowerCase(),
    pct: a.max > 0 ? Math.round((a.value / a.max) * 100) : 0,
  }));
  const strong = scored.filter(a => a.pct >= 60).map(a => a.n);
  const weak   = scored.filter(a => a.pct < 45).map(a => a.n);

  const chain = (names: string[]) =>
    names.length === 1
      ? `votre ${names[0]}`
      : names.slice(0, -1).map(n => `votre ${n}`).join(", ") + ` et votre ${names[names.length - 1]}`;

  let main: string, sub: string;
  if (strong.length > 0 && weak.length > 0) {
    main = `${(chain(strong).charAt(0).toUpperCase() + chain(strong).slice(1))} ${strong.length > 1 ? "sont" : "est"} à un bon niveau, mais ${chain(weak)} ${weak.length > 1 ? "demandent" : "demande"} une attention particulière.`;
    sub  = "Ce déséquilibre est courant. En ciblant les axes prioritaires, vous progresserez de façon mesurable dès les premières semaines.";
  } else if (weak.length > 0) {
    main = `${(chain(weak).charAt(0).toUpperCase() + chain(weak).slice(1))} ${weak.length > 1 ? "demandent" : "demande"} une attention particulière pour améliorer votre confort au quotidien.`;
    sub  = "Votre programme cible précisément ces axes. Des progrès concrets sont attendus dès les premières semaines.";
  } else if (strong.length > 0) {
    main = "Tous vos axes sont bien développés, avec une répartition équilibrée sur les 5 dimensions évaluées.";
    sub  = "L'objectif du prochain cycle est de consolider ces acquis et d'atteindre un niveau d'excellence durable.";
  } else {
    main = "Votre profil de mouvement présente des marges de progression sur chacun des 5 axes évalués.";
    sub  = "Votre programme personnalisé a été conçu pour vous faire progresser à votre rythme, de façon cohérente.";
  }

  return `<div class="obs">
    ${sec("Ce que nous avons observé")}
    <div class="obs-text">${esc(main)}</div>
    <div class="obs-sub">${esc(sub)}</div>
  </div>`;
}

// ─── Objectif prochain bilan ──────────────────────────────────────────────────

function renderNextBilan(total: number): string {
  const current   = (total / 8).toFixed(1).replace(".", ",");
  const targetRaw = Math.min(total + 12, 80);
  const target    = (targetRaw / 8).toFixed(1).replace(".", ",");
  return `<div class="nb">
    ${sec("Objectif du prochain bilan")}
    <div class="nb-row">
      <div class="nb-col">
        <div class="nb-lbl">Score actuel</div>
        <div class="nb-score" style="color:${scoreColor(total)}">${current}<span class="nb-unit"> /8</span></div>
      </div>
      <div class="nb-arrow">→</div>
      <div class="nb-col">
        <div class="nb-lbl">Objectif</div>
        <div class="nb-score" style="color:${scoreColor(targetRaw)}">${target}<span class="nb-unit"> /8</span></div>
      </div>
      <div class="nb-sep"></div>
      <div class="nb-col">
        <div class="nb-lbl">Prochain bilan</div>
        <div class="nb-delay">Dans 6 semaines</div>
      </div>
    </div>
  </div>`;
}

// ─── Zones prioritaires ───────────────────────────────────────────────────────

function renderZones(zonePriorities: NonNullable<BilanPdfData["zonePriorities"]>): string {
  const LABELS: Record<string, string> = {
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
  const fortes = Object.entries(zonePriorities).filter(([, v]) => v === "forte").map(([k]) => LABELS[k] ?? k);
  const survs  = Object.entries(zonePriorities).filter(([, v]) => v === "surveillance").map(([k]) => LABELS[k] ?? k);
  if (!fortes.length && !survs.length) return "";

  const header = `<div style="display:flex;gap:10pt;margin-bottom:5pt;margin-top:4pt">
    ${fortes.length ? `<span style="font-size:8.5px;font-weight:700;color:#8A2020;letter-spacing:1px;text-transform:uppercase">● Priorité</span>` : ""}
    ${survs.length  ? `<span style="font-size:8.5px;font-weight:700;color:#7A4010;letter-spacing:1px;text-transform:uppercase">● Surveillance</span>` : ""}
  </div>`;

  const chips = [
    ...fortes.map(l => `<span class="z-chip z-forte">${esc(l)}</span>`),
    ...survs.map(l  => `<span class="z-chip z-surv">${esc(l)}</span>`),
  ].join("");

  return `<div class="card">
    ${sec("Zones prioritaires")}
    ${header}
    <div class="z-chips">${chips}</div>
  </div>`;
}

// ─── Composition corporelle éditoriale (page 3) ───────────────────────────────

function renderComposition(bc: NonNullable<BilanPdfData["bodyComposition"]>): string {
  const all = [
    bc.weightKg     !== null ? { v: bc.weightKg!.toFixed(1).replace(".", ","),   u: "kg",   k: "Poids"          } : null,
    bc.fatPct       !== null ? { v: bc.fatPct!.toFixed(1).replace(".", ","),     u: "%",    k: "Masse grasse"    } : null,
    bc.musclePct    !== null ? { v: bc.musclePct!.toFixed(1).replace(".", ","),  u: "%",    k: "Masse musc."     } : null,
    bc.waterPct     !== null ? { v: bc.waterPct!.toFixed(1).replace(".", ","),   u: "%",    k: "Hydratation"     } : null,
    bc.visceralFat  !== null ? { v: String(bc.visceralFat),                      u: "",     k: "Graisse visc."   } : null,
    bc.metabolicAge !== null ? { v: String(bc.metabolicAge),                     u: "ans",  k: "Âge métab."      } : null,
    bc.boneMassKg   !== null ? { v: bc.boneMassKg!.toFixed(1).replace(".", ","), u: "kg",   k: "Masse osseuse"   } : null,
    bc.bmrKcal      !== null ? { v: String(bc.bmrKcal),                          u: "kcal", k: "Métabolisme"     } : null,
  ].filter(Boolean) as Array<{ v: string; u: string; k: string }>;

  if (!all.length) return "";
  const display = all.slice(0, 4);

  const stats = display.map(it => `<div class="comp-stat">
    <div class="comp-stat-v">${esc(it.v)}<span class="comp-stat-u">${esc(it.u)}</span></div>
    <div class="comp-stat-k">${esc(it.k)}</div>
  </div>`).join("");

  const segItems = [
    bc.segArmLeft   !== null ? { v: bc.segArmLeft!.toFixed(1).replace(".", ","),  k: "Bras G."  } : null,
    bc.segArmRight  !== null ? { v: bc.segArmRight!.toFixed(1).replace(".", ","), k: "Bras D."  } : null,
    bc.segTrunk     !== null ? { v: bc.segTrunk!.toFixed(1).replace(".", ","),    k: "Tronc"    } : null,
    bc.segLegLeft   !== null ? { v: bc.segLegLeft!.toFixed(1).replace(".", ","),  k: "Jambe G." } : null,
    bc.segLegRight  !== null ? { v: bc.segLegRight!.toFixed(1).replace(".", ","), k: "Jambe D." } : null,
  ].filter(Boolean) as Array<{ v: string; k: string }>;

  const segHtml = segItems.length >= 3 ? `
    <div class="seg-sub-hd">
      <span class="seg-sub-lbl">Masse segmentaire</span>
      <div class="seg-sub-rule"></div>
    </div>
    <div class="seg-row">${segItems.map(it => `<div class="seg-stat">
      <div class="seg-stat-v">${esc(it.v)}<span class="seg-stat-u">kg</span></div>
      <div class="seg-stat-k">${esc(it.k)}</div>
    </div>`).join("")}</div>` : "";

  return `<div class="p3-section">
    ${sec("Composition corporelle")}
    <div class="comp-editorial">${stats}</div>
    ${segHtml}
  </div>`;
}

// ─── Suites & recommandations coach (page 3) ─────────────────────────────────

function renderRecommandations(
  rec: string[],
  nextAction: string | null,
  axes: BilanPdfData["axes"],
  tests: BilanPdfData["tests"],
): string {
  if (!rec?.length && !nextAction) return "";

  const nextActionHtml = nextAction
    ? `<div style="margin-bottom:6pt;padding:5pt 8pt;background:rgba(184,149,106,0.08);border-left:2pt solid #B8956A;border-radius:2pt">
        <div style="font-size:8px;font-weight:700;color:#A89070;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2pt">Prochaine action</div>
        <div style="font-size:9.5px;color:#1E1812;line-height:1.4">${esc(nextAction)}</div>
      </div>`
    : "";

  const chips = rec?.length
    ? `<div class="rec-chips">${rec.map(r => `<span class="rec-chip">${esc(r)}</span>`).join("")}</div>`
    : "";

  const sortedAxes = [...(axes ?? [])].sort((a, b) => {
    const pA = a.max > 0 ? a.value / a.max : 0;
    const pB = b.max > 0 ? b.value / b.max : 0;
    return pA - pB;
  });
  const weakAxes = sortedAxes.slice(0, 2).filter(a => (a.max > 0 ? a.value / a.max : 0) < 0.7);
  const hasComps = (tests ?? []).filter(t => t.score <= 1).length >= 1;

  let detailText = "";
  if (weakAxes.length >= 2) {
    detailText = `Priorité : ${weakAxes[0].label.toLowerCase()} et ${weakAxes[1].label.toLowerCase()}${hasComps ? " — compensations à corriger" : ""}.`;
  } else if (weakAxes.length === 1) {
    detailText = `Priorité : ${weakAxes[0].label.toLowerCase()}${hasComps ? " — compensations à corriger" : ""}.`;
  } else if (rec?.length) {
    detailText = "Profil équilibré — consolider les acquis et progresser vers l'excellence.";
  }

  return `<div class="p3-section">
    ${sec("Suites &amp; recommandations")}
    ${nextActionHtml}
    ${chips}
    ${detailText ? `<div class="rec-detail">${esc(detailText)}</div>` : ""}
  </div>`;
}

// ─── Projection éditoriale (page 3) ──────────────────────────────────────────

function renderProjectionEditorial(priorities: string[], concreteGoal: string | null): string {
  if (!priorities?.length && !concreteGoal) return "";

  const steps = [
    { week: "Semaines 1–2", title: priorities?.[0] || "Phase d'activation",  desc: null },
    { week: "Semaines 3–4", title: priorities?.[1] || "Phase de progression", desc: null },
    { week: "Semaines 5–6", title: priorities?.[2] || concreteGoal || "Consolidation", desc: null },
  ];

  const stepsHtml = steps.map((s, i) => `<div class="proj-ed-step">
    <div class="proj-ed-num">${i + 1}</div>
    <div class="proj-ed-week">${esc(s.week)}</div>
    <div class="proj-ed-title">${esc(s.title)}</div>
    ${s.desc ? `<div class="proj-ed-desc">${esc(s.desc)}</div>` : ""}
  </div>`).join("");

  return `<div class="proj-editorial">
    ${sec("Projection 6 semaines")}
    <div class="proj-ed-steps">${stepsHtml}</div>
  </div>`;
}

// ─── Trajectoire (page 3) ────────────────────────────────────────────────────

function renderTrajectoire(): string {
  const steps = [
    { label: "Aujourd'hui", desc: "Point de départ" },
    { label: "6 semaines",  desc: "Premiers gains de mobilité et de confort" },
    { label: "3 mois",      desc: "Amélioration durable des capacités physiques" },
    { label: "6 mois",      desc: "Consolidation des acquis et progression continue" },
  ];

  const items = steps.map((s, i) => `<div class="traj-item">
    <div class="traj-left">
      <div class="traj-dot"></div>
      ${i < steps.length - 1 ? '<div class="traj-vline"></div>' : ""}
    </div>
    <div class="traj-right">
      <div class="traj-label">${esc(s.label)}</div>
      <div class="traj-desc">${esc(s.desc)}</div>
    </div>
  </div>`).join("");

  return `<div class="p3-section">
    ${sec("Votre trajectoire")}
    <div class="traj-timeline">${items}</div>
  </div>`;
}

// ─── Citation premium (page 3) ───────────────────────────────────────────────

function renderQuotePremium(): string {
  return `<div class="p3-quote-wrap">
    <div class="p3-hr"></div>
    <div class="p3-quote">« Le mouvement est le premier outil de santé que nous possédons. »</div>
    <div class="p3-hr"></div>
  </div>`;
}

// ─── Closing ──────────────────────────────────────────────────────────────────

function renderClosing(d: BilanPdfData): string {
  const contact = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");
  return `<div class="closing">
    <div class="closing-rule">
      <div class="closing-line"></div>
      <div class="closing-dia"></div>
      <div class="closing-line"></div>
    </div>
    <div class="closing-name">${esc(d.cabinetName)}</div>
    <div class="closing-sub">Cabinet spécialisé mouvement &amp; performance</div>
    ${contact ? `<div class="closing-contact">${esc(contact)}</div>` : ""}
    <div class="closing-conf">Document confidentiel · ${esc(d.dateStr)}</div>
  </div>`;
}

// ─── Page 4 : Cartographie corporelle ────────────────────────────────────────

const ZONE_DISPLAY_LABELS: Record<string, string> = {
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
  genoux:            "Genoux",
  mollets:           "Mollets",
  chevilles:         "Chevilles",
  pieds:             "Pieds",
};

const ZONE_MOVEMENT_LABELS: Record<string, string> = {
  dos_haut:          "Stabilité scapulaire",
  epaules:           "Amplitude des épaules",
  pectoraux:         "Souplesse pectorale",
  grand_dorsal:      "Stabilité dorsale",
  lombaires:         "Stabilité lombaire",
  sangle_abdominale: "Gainage abdominal",
  bassin:            "Équilibre du bassin",
  hanches:           "Amplitude des hanches",
  fessiers:          "Force des fessiers",
  quadriceps:        "Renforcement des quadriceps",
  ischio_jambiers:   "Souplesse ischio-jambiers",
  genoux:            "Stabilité des genoux",
  mollets:           "Souplesse des mollets",
  chevilles:         "Mobilité des chevilles",
  pieds:             "Stabilité plantaire",
};


// Silhouettes SVG remplacées par l'image body-map.png (voir renderBodyMap)


function bodyMapAnalysis(d: BilanPdfData): string {
  const zones     = (d.zonePriorities ?? {}) as Record<string, string>;
  const forte     = Object.entries(zones).filter(([, v]) => v === "forte").map(([k]) => ZONE_DISPLAY_LABELS[k] ?? k);
  const ameliorer = Object.entries(zones).filter(([, v]) => v === "ameliorer").map(([k]) => ZONE_DISPLAY_LABELS[k] ?? k);
  const surv      = Object.entries(zones).filter(([, v]) => v === "surveillance").map(([k]) => ZONE_DISPLAY_LABELS[k] ?? k);

  const weakAxes = [...(d.axes ?? [])]
    .filter(a => a.max > 0 && a.value / a.max < 0.75)
    .sort((a, b) => (a.value / a.max) - (b.value / b.max))
    .slice(0, 2);

  const parts: string[] = [];

  if (forte.length > 0) {
    const list = forte.slice(0, 3).map(l => l.toLowerCase()).join(", ");
    let sentence = `Une attention prioritaire est identifiée au niveau ${forte.length === 1 ? "de la" : "de"} ${list}`;
    const secondary = [...ameliorer, ...surv].slice(0, 2).map(l => l.toLowerCase());
    if (secondary.length > 0) sentence += `, avec un suivi recommandé pour ${secondary.join(" et ")}`;
    parts.push(sentence);
  } else if (ameliorer.length > 0) {
    const list = ameliorer.slice(0, 3).map(l => l.toLowerCase()).join(", ");
    let sentence = `Un travail ciblé est recommandé au niveau ${ameliorer.length === 1 ? "de la" : "de"} ${list}`;
    if (surv.length > 0) sentence += `, avec une surveillance préventive pour ${surv.slice(0, 2).map(l => l.toLowerCase()).join(" et ")}`;
    parts.push(sentence);
  } else if (surv.length > 0) {
    const list = surv.slice(0, 3).map(l => l.toLowerCase()).join(", ");
    parts.push(`Un suivi préventif est conseillé au niveau ${surv.length === 1 ? "de la" : "de"} ${list}`);
  }

  if (weakAxes.length > 0) {
    const axList = weakAxes.map(a => a.label.toLowerCase()).join(" et ");
    parts.push(`Les capacités de ${axList} présentent une marge de progression importante`);
  }

  let text = parts.length > 0 ? parts.join(". ") + ". " : "";
  text += "Un travail ciblé et progressif permettra d'améliorer durablement votre confort corporel et votre qualité de mouvement au quotidien.";
  return text;
}

function renderBodyMap(d: BilanPdfData, name: string, totalPages: number): string {
  const zones = (d.zonePriorities ?? {}) as Record<string, string>;

  // Zone color helper
  const zc = (key: string): { fill: string; opacity: number; strokeOpacity: number } => {
    const v = zones[key];
    if (v === "forte")        return { fill: "#5E2A0E", opacity: 0.90, strokeOpacity: 0.96 };
    if (v === "ameliorer")    return { fill: "#7A4A18", opacity: 0.85, strokeOpacity: 0.92 };
    if (v === "surveillance") return { fill: "#8E6B28", opacity: 0.75, strokeOpacity: 0.82 };
    return                           { fill: "none",   opacity: 0,    strokeOpacity: 0    };
  };

  // ── Centres calibrés visuellement via outil de calibration (1536×1024)
  // FC=492 · BC=1026 — dérivés du point médian des paires symétriques calibrées
  const FC = 492;   // centre figure face (calibré)
  const BC = 1026;  // centre figure dos  (calibré)

  // Halo relatif au centre du groupe SVG (cx = offset depuis FC ou BC)
  const zr = (key: string, cx: number, cy: number, rx: number, ry: number): string => {
    const { fill, opacity, strokeOpacity } = zc(key);
    if (fill === "none") return "";
    const haloOp = +(opacity * 0.42).toFixed(2);
    return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" fill-opacity="${opacity}"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" fill-opacity="${haloOp}" filter="url(#zone-halo)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${fill}" stroke-opacity="${strokeOpacity}" stroke-width="2.5" filter="url(#zone-organic)"/>`;
  };

  // ── Coordonnées calibrées visuellement — clics directs sur l'image anatomique
  // Pour ajuster : modifier FC/BC pour déplacer toute une vue,
  //               ou modifier l'offset cx/cy d'une zone individuelle.
  const zonesSvg = `
    <!-- ═══ VUE FACE — translate(${FC}, 0) ═══ -->
    <g transform="translate(${FC}, 0)">
      ${zr("epaules",           +80,  212,  36, 28)}
      ${zr("epaules",           -82,  214,  36, 28)}
      ${zr("pectoraux",           0,  270,  62, 52)}
      ${zr("sangle_abdominale",   0,  340,  52, 55)}
      ${zr("bassin",              0,  400,  65, 24)}
      ${zr("hanches",           +61,  419,  38, 38)}
      ${zr("hanches",           -58,  425,  38, 38)}
      ${zr("quadriceps",        +45,  511,  34, 85)}
      ${zr("quadriceps",        -48,  523,  34, 85)}
      ${zr("genoux",            +50,  621,  30, 25)}
      ${zr("genoux",            -52,  625,  30, 25)}
      ${zr("chevilles",         +47,  826,  18, 15)}
      ${zr("chevilles",         -43,  829,  18, 15)}
      ${zr("pieds",             +47,  868,  40, 15)}
      ${zr("pieds",             -43,  868,  40, 15)}
    </g>
    <!-- ═══ VUE DOS — translate(${BC}, 0) ═══ -->
    <g transform="translate(${BC}, 0)">
      ${zr("epaules",           -73,  215,  32, 28)}
      ${zr("epaules",           +69,  214,  32, 28)}
      ${zr("dos_haut",           -2,  219, 118, 65)}
      ${zr("grand_dorsal",       -2,  308,  92, 75)}
      ${zr("lombaires",          -2,  382,  48, 24)}
      ${zr("fessiers",          -43,  440,  50, 60)}
      ${zr("fessiers",          +45,  439,  50, 60)}
      ${zr("ischio_jambiers",   -54,  544,  34, 85)}
      ${zr("ischio_jambiers",   +49,  545,  34, 85)}
      ${zr("genoux",            -53,  646,  30, 25)}
      ${zr("genoux",            +55,  645,  30, 25)}
      ${zr("mollets",           -58,  717,  20, 50)}
      ${zr("mollets",           +57,  712,  20, 50)}
      ${zr("chevilles",         -45,  837,  18, 15)}
      ${zr("chevilles",         +49,  835,  18, 15)}
      ${zr("pieds",             -45,  876,  40, 15)}
      ${zr("pieds",             +49,  876,  40, 15)}
    </g>`;

  // Axes prioritaires — classés par priorité décroissante
  const forteKeys     = Object.entries(zones).filter(([, v]) => v === "forte").map(([k]) => k);
  const ameliorerKeys = Object.entries(zones).filter(([, v]) => v === "ameliorer").map(([k]) => k);
  const survKeys      = Object.entries(zones).filter(([, v]) => v === "surveillance").map(([k]) => k);

  const axeItems: string[] = [];
  for (const k of forteKeys)     axeItems.push(ZONE_MOVEMENT_LABELS[k] ?? ZONE_DISPLAY_LABELS[k] ?? k);
  for (const k of ameliorerKeys) axeItems.push(ZONE_MOVEMENT_LABELS[k] ?? ZONE_DISPLAY_LABELS[k] ?? k);
  for (const k of survKeys)      axeItems.push(ZONE_MOVEMENT_LABELS[k] ?? ZONE_DISPLAY_LABELS[k] ?? k);

  const weakAxes = [...(d.axes ?? [])]
    .filter(a => a.max > 0 && a.value / a.max < 0.6)
    .sort((a, b) => (a.value / a.max) - (b.value / b.max))
    .slice(0, 2);
  for (const ax of weakAxes) {
    const lbl = ax.label.charAt(0).toUpperCase() + ax.label.slice(1);
    if (!axeItems.some(i => i.toLowerCase().includes(ax.label.toLowerCase()))) {
      axeItems.push(lbl);
    }
  }

  const axesHtml = axeItems.length > 0 ? `<div class="p4-axes">
    <div class="p4-axes-lbl">Axes prioritaires</div>
    <div class="p4-axes-list">
      ${axeItems.slice(0, 7).map(it => `<div class="p4-axes-item"><span class="p4-axes-dot">◆</span>${esc(it)}</div>`).join("")}
    </div>
  </div>` : "";

  return `<div class="page">
  ${renderMiniHeader(name, d.dateStr, `4 / ${totalPages}`)}
  <div class="p4-body">
    <div>
      ${sec("Cartographie corporelle")}
      <div class="p4-subtitle">Visualisation des zones nécessitant une attention particulière afin d'optimiser votre mobilité et votre qualité de mouvement.</div>
    </div>
    <div class="p4-bodymap">
      ${d.bodyMapUrl
        ? `<div class="p4-bodymap-wrap">
        <img class="p4-bodymap-img" src="${esc(d.bodyMapUrl)}" alt="Cartographie corporelle"/>
        <svg class="p4-bodymap-svg" viewBox="0 0 1536 1024" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="zone-halo" x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur stdDeviation="5"/>
            </filter>
            <filter id="zone-organic" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="5" result="noise"/>
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
          </defs>
          ${zonesSvg}
        </svg>
      </div>`
        : `<div style="background:#b00;color:#fff;font-size:14px;font-weight:700;padding:18px 24px;border-radius:4px;letter-spacing:0.5px;">
        ⚠ BODY-MAP NON CHARGÉ — vérifier body-map.png dans public/pdf-assets/
      </div>`}
    </div>
    <div class="p4-legend">
      <div class="p4-legend-item">
        <div class="p4-legend-dot" style="background:#8E6B28;border:0.5pt solid #7A5820"></div>
        <div class="p4-legend-item-txt">
          <span class="p4-legend-name">Surveillance</span>
          ${survKeys.length > 0 ? `<span class="p4-legend-count">${survKeys.length} zone${survKeys.length > 1 ? "s" : ""}</span>` : ""}
        </div>
      </div>
      <div class="p4-legend-item">
        <div class="p4-legend-dot" style="background:#7A4A18;border:0.5pt solid #663C10"></div>
        <div class="p4-legend-item-txt">
          <span class="p4-legend-name">À améliorer</span>
          ${ameliorerKeys.length > 0 ? `<span class="p4-legend-count">${ameliorerKeys.length} zone${ameliorerKeys.length > 1 ? "s" : ""}</span>` : ""}
        </div>
      </div>
      <div class="p4-legend-item">
        <div class="p4-legend-dot" style="background:#5E2A0E;border:0.5pt solid #4A2008"></div>
        <div class="p4-legend-item-txt">
          <span class="p4-legend-name">Priorité de travail</span>
          ${forteKeys.length > 0 ? `<span class="p4-legend-count">${forteKeys.length} zone${forteKeys.length > 1 ? "s" : ""}</span>` : ""}
        </div>
      </div>
    </div>
    <div class="p4-info">
      <div class="p4-analyse">
        <div class="p4-analyse-lbl">Analyse du mouvement</div>
        <div class="p4-analyse-txt">${esc(bodyMapAnalysis(d))}</div>
      </div>
      ${axesHtml}
    </div>
  </div>
  ${renderClosing(d)}
  ${renderFooter2(d.cabinetName, `Page ${totalPages} / ${totalPages}`)}
</div>`;
}

// ─── Générateur principal ─────────────────────────────────────────────────────

export function generateBilanHtml(
  d: BilanPdfData,
  _mode: "client" | "coach" = "coach",
  options?: { forceBodyMap?: boolean },
): string {
  const name    = formatName(d.clientName || "Client");
  const total   = d.total ?? 0;
  const footer1 = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ") || `Document confidentiel · ${d.dateStr}`;

  const hasTests    = (d.tests?.length ?? 0) > 0;
  const hasProg     = (d.topPriorities?.length ?? 0) > 0 || !!d.frequency;
  const hasLim      = (d.activeLim?.length ?? 0) > 0;
  const hasRessenti = d.energyScore !== null || d.stressScore !== null || d.sleepScore !== null || d.painScore !== null;
  const hasZones    = !!(d.zonePriorities && Object.entries(d.zonePriorities).some(([, v]) => v === "forte" || v === "surveillance"));
  const hasComp     = !!(d.bodyComposition && (
    d.bodyComposition.weightKg !== null || d.bodyComposition.fatPct !== null ||
    d.bodyComposition.musclePct !== null || d.bodyComposition.waterPct !== null ||
    d.bodyComposition.boneMassKg !== null || d.bodyComposition.visceralFat !== null ||
    d.bodyComposition.bmrKcal !== null || d.bodyComposition.metabolicAge !== null
  ));
  const hasRec     = (d.activeRec?.length ?? 0) > 0;
  const hasAxes    = (d.axes?.length ?? 0) > 0;
  const hasRoadmap = !!(d.mainGoal || d.frequency || d.nextAction || hasAxes);
  const hasWhyAxes = hasAxes && (d.axes ?? []).some(a => a.max > 0 && a.value / a.max < 0.65);
  const totalPages = 4;

  // ── PAGE 1 : 2 colonnes — gauche : diagnostic / droite : score + analyse + plan ──
  const page1 = `<div class="page">
  ${renderHeader(d)}
  ${renderHero(d, name)}
  <div class="p1-body">
    <div class="p1-left">
      ${renderAxes(d.axes)}
      ${hasAxes ? renderForcesAndPriorities(d.axes) : ""}
      ${hasProg ? renderProgramme(d.topPriorities, d.frequency) : ""}
      ${hasLim ? renderLimitations(d.activeLim) : ""}
    </div>
    <div class="p1-vsep"></div>
    <div class="p1-right">
      ${renderProfileLevel(total)}
      ${hasTests ? renderTests(d.tests) : ""}
      ${hasRessenti ? renderRessenti(d) : ""}
    </div>
  </div>
  ${renderFooter(d.cabinetName, footer1)}
</div>`;

  // ── PAGE 2 : Observations, zones, tests, cartographie ────────────────────
  const page2 = `<div class="page">
  ${renderMiniHeader(name, d.dateStr, `2 / ${totalPages}`)}
  <div class="p2-body">
    <div class="p2-upper">
      <div class="p2-obs-col">
        ${renderObservations(d)}
      </div>
      <div class="p2-vsep"></div>
      <div class="p2-side-col">
        ${hasZones ? renderZones(d.zonePriorities!) : ""}
        ${hasTests ? renderTestsTable(d.tests) : ""}
      </div>
    </div>
    <div class="p2-radar">
      ${hasAxes ? renderBigRadar(d.axes) : ""}
    </div>
  </div>
  ${renderFooter2(d.cabinetName, `Page 2 / ${totalPages}`)}
</div>`;

  // ── PAGE 3 : Feuille de route (principal) → Pourquoi ces axes → Composition ──
  const page3 = `<div class="page">
  ${renderMiniHeader(name, d.dateStr, `3 / ${totalPages}`)}
  <div class="p3-body">
    ${hasRoadmap ? renderRoadmap(d) : ""}
    ${hasWhyAxes ? renderWhyAxes(d.axes) : ""}
    ${hasComp ? renderComposition(d.bodyComposition!) : ""}
    ${(hasRec || d.nextAction) ? renderRecommandations(d.activeRec ?? [], d.nextAction, d.axes, d.tests) : ""}
    ${renderTrajectoire()}
    ${renderQuotePremium()}
  </div>
  ${renderFooter2(d.cabinetName, `Page 3 / ${totalPages}`)}
</div>`;

  const page4 = renderBodyMap(d, name, totalPages);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bilan Mouvement — ${esc(name)}</title>
<style>${CSS}</style>
</head>
<body>${page1}${page2}${page3}${page4}</body>
</html>`;
}
