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
  coachSignature: string | null;
  clientSignature: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function coachInitials(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? "").slice(0, 2).join("");
}

function scoreColor(s: number): string {
  return s >= 80 ? "#2E7D52" : s >= 60 ? "#B8956A" : s >= 40 ? "#C47040" : "#B84444";
}

function scoreLabel(s: number): string {
  return s >= 80 ? "Excellent" : s >= 60 ? "Bon niveau" : s >= 40 ? "En progression" : "À travailler";
}

function barColor(pct: number): string {
  return pct >= 75 ? "#2E7D52" : pct >= 50 ? "#B8956A" : pct >= 25 ? "#C47040" : "#B84444";
}

function clientScoreZone(score: number): { label: string; color: string } {
  const s = score / 10;
  if (s >= 9) return { label: "Excellent",      color: "#2E7D52" };
  if (s >= 7) return { label: "Solide",         color: "#2E7D52" };
  if (s >= 4) return { label: "En progression", color: "#B8956A" };
  return          { label: "À construire",      color: "#C47040" };
}

// ─── SVG : Score — grand, minimal, luxe ──────────────────────────────────────

function gaugeSvg(score: number, _mode: "client" | "coach" = "coach"): string {
  const cx = 72, cy = 72, R = 56;
  const circ  = 2 * Math.PI * R;
  const filled = (circ * Math.min(score, 100) / 100).toFixed(2);
  const gap    = (circ - circ * Math.min(score, 100) / 100).toFixed(2);
  const col    = scoreColor(score);
  // Always display as X,Y / 10 for premium readability
  const displayVal = (score / 10).toFixed(1).replace(".", ",");
  const displayMax = "/ 10";
  const numSize    = displayVal.length >= 4 ? 34 : 42;
  const numY       = displayVal.length >= 4 ? cy + 12 : cy + 15;

  // 40 repères de précision — style instrument clinique suisse
  const ticks = Array.from({length: 40}, (_, i) => {
    const a  = -Math.PI / 2 + (2 * Math.PI * i / 40);
    const major = i % 8 === 0;
    const ro = major ? 67 : 64;
    const ri = 59;
    const x1 = (cx + ro * Math.cos(a)).toFixed(1);
    const y1 = (cy + ro * Math.sin(a)).toFixed(1);
    const x2 = (cx + ri * Math.cos(a)).toFixed(1);
    const y2 = (cy + ri * Math.sin(a)).toFixed(1);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#C8C0B0" stroke-width="${major ? "0.7" : "0.35"}" opacity="${major ? "0.55" : "0.26"}"/>`;
  }).join("");

  return `<svg width="144" height="144" viewBox="0 0 144 144" xmlns="http://www.w3.org/2000/svg">
    <!-- Anneau extérieur -->
    <circle cx="${cx}" cy="${cy}" r="70" fill="none" stroke="#E4DCD0" stroke-width="0.4" opacity="0.6"/>
    <!-- Repères de précision — instrument clinique -->
    ${ticks}
    <!-- Track -->
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#EAE2D8" stroke-width="1.2"/>
    <!-- Anneau intérieur -->
    <circle cx="${cx}" cy="${cy}" r="42" fill="none" stroke="#EEE8E0" stroke-width="0.35" opacity="0.5"/>
    <!-- Arc score — trait fin, précis -->
    <g transform="rotate(-90,${cx},${cy})">
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="none"
        stroke="${col}" stroke-width="1.5"
        stroke-dasharray="${filled} ${gap}"
        stroke-linecap="round"/>
    </g>
    <!-- Séparateur éditorial -->
    <line x1="${cx - 11}" y1="${cy - 5}" x2="${cx + 11}" y2="${cy - 5}"
      stroke="#D4C4A8" stroke-width="0.5" opacity="0.7"/>
    <!-- Valeur -->
    <text x="${cx}" y="${numY}" text-anchor="middle"
      font-family="'Playfair Display',Georgia,serif"
      font-size="${numSize}" font-weight="800" fill="${col}">${displayVal}</text>
    <text x="${cx}" y="${cy + 30}" text-anchor="middle"
      font-family="'Inter',-apple-system,sans-serif"
      font-size="8" font-weight="300" fill="#C4B4A2" letter-spacing="1.5">${displayMax}</text>
  </svg>`;
}

// ─── SVG : Radar premium ─────────────────────────────────────────────────────

function radarSvg(axes: BilanPdfData["axes"]): string {
  const cx = 180, cy = 145, R = 90, N = 5;
  const ang  = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / N;
  const pt   = (i: number, s = 1) => ({
    x: cx + R * s * Math.cos(ang(i)),
    y: cy + R * s * Math.sin(ang(i)),
  });
  const poly = (s: number) =>
    Array.from({ length: N }, (_, i) => `${pt(i, s).x.toFixed(1)},${pt(i, s).y.toFixed(1)}`).join(" ");

  const fracs      = axes.map(a => Math.min(a.value, a.max) / a.max);
  const dataPoints = axes.map((_, i) => `${pt(i, fracs[i]).x.toFixed(1)},${pt(i, fracs[i]).y.toFixed(1)}`).join(" ");

  const gridRings = [0.25, 0.5, 0.75].map(s =>
    `<polygon points="${poly(s)}" fill="none" stroke="#C4B8A4" stroke-width="0.5" stroke-dasharray="2 6" opacity="0.75"/>`
  ).join("");

  const spokes = Array.from({ length: N }, (_, i) => {
    const p = pt(i);
    return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#C8BEB0" stroke-width="0.55" opacity="0.65"/>`;
  }).join("");

  const dots = axes.map((_, i) => {
    const p = pt(i, fracs[i]);
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="#FDFBF8" stroke="#B8956A" stroke-width="1.9"/>
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.2" fill="#B8956A"/>`;
  }).join("");

  const labelR  = R + 22;
  const anchors = ["middle", "start", "start", "end", "end"] as const;
  const labels  = axes.map((a, i) => {
    const lx = cx + labelR * Math.cos(ang(i));
    const ly = cy + labelR * Math.sin(ang(i));
    const dy = i === 0 ? -4 : 2;
    return `<text x="${lx.toFixed(1)}" y="${(ly + dy + 3).toFixed(1)}"
      text-anchor="${anchors[i]}"
      font-family="'Inter',-apple-system,sans-serif"
      font-size="8" font-weight="600" fill="#8A7E70" letter-spacing="0.5">${esc(a.label.toUpperCase())}</text>
    <text x="${lx.toFixed(1)}" y="${(ly + dy + 14).toFixed(1)}"
      text-anchor="${anchors[i]}"
      font-family="'Playfair Display',Georgia,serif"
      font-size="12" font-weight="700" fill="${barColor(fracs[i] * 100)}">${a.value}</text>`;
  }).join("");

  return `<svg width="248" height="215" viewBox="0 0 340 290" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="rBg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FDFAF5"/>
        <stop offset="60%" stop-color="#F6F0E8"/>
        <stop offset="100%" stop-color="#EDE6D8"/>
      </radialGradient>
      <radialGradient id="rFill" cx="50%" cy="40%" r="56%">
        <stop offset="0%" stop-color="rgba(184,149,106,0.40)"/>
        <stop offset="100%" stop-color="rgba(184,149,106,0.10)"/>
      </radialGradient>
    </defs>
    <circle cx="${cx}" cy="${cy}" r="114" fill="url(#rBg)" stroke="#E0D8CC" stroke-width="0.4" opacity="0.5"/>
    ${gridRings}
    <polygon points="${poly(1)}" fill="none" stroke="#C8BEA8" stroke-width="0.7" opacity="0.7"/>
    ${spokes}
    <polygon points="${dataPoints}" fill="url(#rFill)" stroke="none"/>
    <polygon points="${dataPoints}" fill="none" stroke="#B8956A" stroke-width="2.2" stroke-linejoin="round" opacity="0.92"/>
    ${dots}
    <circle cx="${cx}" cy="${cy}" r="2" fill="#D8D0C0" opacity="0.8"/>
    ${labels}
  </svg>`;
}

// ─── Composants HTML ──────────────────────────────────────────────────────────

const TEST_CFG = {
  0: { label: "DOULEUR",      bg: "#FEF4F4", border: "#F0C0C0", text: "#8A2828", bar: "#C44444" },
  1: { label: "COMPENSATION", bg: "#FDF9F2", border: "#E8CFA0", text: "#7A5020", bar: "#C47040" },
  2: { label: "OPTIMAL",      bg: "#F2FBF6", border: "#A4DEBA", text: "#1A5C38", bar: "#2E7D52" },
} as const;

function secTitle(label: string): string {
  return `<div class="sec-head">
    <span class="sec-label">${esc(label.toUpperCase())}</span>
    <div class="sec-rule"></div>
  </div>`;
}

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

function priorityCards(priorities: string[], frequency?: string | null): string {
  if (!priorities.length) return "";
  const [p1, p2, p3] = priorities;
  return `<div class="prio-col">
    ${secTitle("Programme recommandé")}
    ${p1 ? `<div class="pcard p1c">
      <div class="pnum gold-p">MAINTENANT</div>
      <div class="pname p1n">→ ${esc(p1)}</div>
    </div>` : ""}
    ${p2 ? `<div class="pcard p2c">
      <div class="pnum taupe-p">ENSUITE</div>
      <div class="pname p2n">→ ${esc(p2)}</div>
    </div>` : ""}
    ${p3 ? `<div class="pcard p3c">
      <div class="pnum muted-p">PUIS</div>
      <div class="pname p3n">→ ${esc(p3)}</div>
    </div>` : ""}
    ${frequency ? `<div class="freq-badge">
      <div class="freq-lbl">Fréquence recommandée</div>
      <div class="freq-val">${esc(frequency)}</div>
    </div>` : ""}
  </div>`;
}

function testsList(tests: BilanPdfData["tests"], mode: "client" | "coach" = "coach"): string {
  if (!tests.length) return "";
  const rows = tests.map(t => {
    const cfg = TEST_CFG[t.score];
    return `<div class="test-row">
      <div class="test-bar" style="background:${cfg.bar}"></div>
      <div class="test-body">
        <div class="test-top">
          <span class="test-name">${esc(t.label)}</span>
          <span class="test-badge" style="background:${cfg.bg};border-color:${cfg.border};color:${cfg.text}">${cfg.label}</span>
        </div>
        ${t.observation && mode === "coach" ? `<div class="test-obs">${esc(t.observation)}</div>` : ""}
      </div>
    </div>`;
  }).join("");
  return `<div class="tests-card">
    <div class="tests-hd">${secTitle("Évaluation des mouvements")}</div>
    ${rows}
  </div>`;
}

function contextCard(d: BilanPdfData): string {
  const items = [
    d.workType               && { k: "Activité",          v: d.workType },
    d.sportPracticed         && { k: "Sport",             v: d.sportPracticed },
    d.sittingHoursPerDay !== null && { k: "Assis / jour", v: `${d.sittingHoursPerDay} h` },
    d.painZones              && { k: "Zones douloureuses", v: d.painZones },
  ].filter(Boolean) as Array<{ k: string; v: string }>;
  if (!items.length) return "";
  return `<div class="card flex1">
    ${secTitle("Profil & contexte")}
    <div class="ctx-grid">
      ${items.map(it => `<div class="ctx-item">
        <div class="ctx-key">${esc(it.k)}</div>
        <div class="ctx-val">${esc(it.v)}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

function subjectiveCard(d: BilanPdfData): string {
  const items = [
    { label: "Énergie", value: d.energyScore },
    { label: "Stress",  value: d.stressScore },
    { label: "Sommeil", value: d.sleepScore  },
    { label: "Douleur", value: d.painScore   },
  ].filter((s): s is { label: string; value: number } => s.value !== null);
  if (!items.length) return "";
  return `<div class="card flex1">
    ${secTitle("Ressenti subjectif")}
    <div class="subj-row">
      ${items.map(s => {
        const pct = (s.value / 10) * 100;
        const col = barColor(pct);
        return `<div class="subj-item">
          <div class="subj-lbl">${esc(s.label)}</div>
          <div class="subj-nums">
            <span class="subj-val" style="color:${col}">${s.value}</span>
            <span class="subj-max">/10</span>
          </div>
          <div class="bar-track" style="width:50px">
            <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${col}"></div>
          </div>
        </div>`;
      }).join("")}
    </div>
  </div>`;
}

function analysisCard(activeLim: string[], activeRec: string[], mode: "client" | "coach" = "coach"): string {
  const showLim = mode === "coach" && activeLim.length > 0;
  const showRec = activeRec.length > 0;
  if (!showLim && !showRec) return "";
  return `<div class="card" style="margin-bottom:3.5mm">
    ${secTitle(mode === "client" ? "Recommandations" : "Analyse du coach")}
    <div class="analysis-row">
      ${showLim ? `<div class="flex1">
        <div class="analysis-sub">Limitations identifiées</div>
        <div class="chip-row">${activeLim.map(l => `<span class="chip chip-lim">${esc(l)}</span>`).join("")}</div>
      </div>` : ""}
      ${showRec ? `<div class="flex1">
        <div class="analysis-sub">${mode === "client" ? "Axes de travail recommandés" : "Recommandations"}</div>
        <div class="chip-row">${activeRec.map(r => `<span class="chip chip-rec">${esc(r)}</span>`).join("")}</div>
      </div>` : ""}
    </div>
  </div>`;
}

function actionPlanCard(d: BilanPdfData): string {
  const hasGoals    = !!(d.mainGoal || d.concreteGoal);
  const hasSchedule = !!(d.frequency || d.nextAction);
  if (!hasGoals && !hasSchedule) return "";

  const goalRow = hasGoals ? `<div class="ap-goals">
    ${d.mainGoal ? `<div class="ap-gb${d.concreteGoal ? "" : " flex1"}">
      <div class="ap-gk">Objectif principal</div>
      <div class="ap-gv">${esc(d.mainGoal)}</div>
    </div>` : ""}
    ${d.concreteGoal ? `<div class="ap-gb flex1${d.mainGoal ? " ap-gsep" : ""}">
      <div class="ap-gk">Objectif mesurable</div>
      <div class="ap-gv">${esc(d.concreteGoal)}</div>
    </div>` : ""}
  </div>` : "";

  const schedItems = [
    d.frequency  && { k: "Fréquence",       v: d.frequency },
    d.nextAction && { k: "Prochaine étape", v: d.nextAction },
  ].filter(Boolean) as Array<{ k: string; v: string }>;
  const schedRow = schedItems.length ? `<div class="ap-sched">
    ${schedItems.map((s, i) => `<div class="ap-si${i < schedItems.length - 1 ? " ap-ss" : ""}">
      <div class="ap-sk">${esc(s.k)}</div>
      <div class="ap-sv">${esc(s.v)}</div>
    </div>`).join("")}
  </div>` : "";

  return `<div class="ap-card" style="margin-bottom:3.5mm">
    ${secTitle("Vos objectifs")}
    ${goalRow}${schedRow}
  </div>`;
}

function notesCard(d: BilanPdfData, mode: "client" | "coach" = "coach"): string {
  if (mode === "client") return "";
  const fields = [
    d.painEvolution  && { label: "Évolution douleur", text: d.painEvolution },
    (d.oldInjuries || d.operations) && {
      label: "Antécédents",
      text: [d.oldInjuries, d.operations].filter(Boolean).join(" — "),
    },
  ].filter(Boolean) as Array<{ label: string; text: string }>;
  if (!fields.length) return "";
  return `<div class="card notes-card" style="margin-bottom:3.5mm;max-height:28mm;overflow:hidden">
    ${secTitle("Notes & observations")}
    ${fields.map((n, i) => `<div${i > 0 ? ' style="margin-top:8pt"' : ""}>
      <div class="note-key">${esc(n.label)}</div>
      <div class="note-text">${esc(n.text)}</div>
    </div>`).join("")}
  </div>`;
}

function observationsCard(d: BilanPdfData): string {
  if (!d.axes.length) return "";

  const scored = d.axes.map(a => ({
    n: a.label.toLowerCase(),
    pct: Math.round((a.value / a.max) * 100),
  }));

  const strong = scored.filter(a => a.pct >= 60).map(a => a.n);
  const weak   = scored.filter(a => a.pct < 45).map(a => a.n);

  const chain = (names: string[]) =>
    names.length === 1
      ? `votre ${names[0]}`
      : names.slice(0, -1).map(n => `votre ${n}`).join(", ") + ` et votre ${names[names.length - 1]}`;

  let text: string;

  if (strong.length > 0 && weak.length > 0) {
    const sp = strong.length > 1 ? "sont à un bon niveau" : "est à un bon niveau";
    const wp = weak.length > 1   ? "freinent encore certains de vos mouvements" : "freine encore certains de vos mouvements";
    const S  = chain(strong);
    text = `${S.charAt(0).toUpperCase() + S.slice(1)} ${sp}, mais ${chain(weak)} ${wp}.`;
  } else if (weak.length > 0) {
    const wp = weak.length > 1 ? "demandent" : "demande";
    const W  = chain(weak);
    text = `${W.charAt(0).toUpperCase() + W.slice(1)} ${wp} une attention particulière pour améliorer votre confort au quotidien.`;
  } else if (strong.length > 0) {
    text = "Tous vos axes sont bien développés, avec une répartition équilibrée sur les 5 dimensions évaluées.";
  } else {
    text = "Votre profil de mouvement est en développement régulier, avec des marges de progression sur chacun des 5 axes.";
  }

  return `<div class="card obs-card" style="margin-bottom:3.5mm">
    ${secTitle("Ce que nous avons observé")}
    <div class="obs-text">${esc(text)}</div>
  </div>`;
}

function nextBilanCard(d: BilanPdfData): string {
  const current    = (d.total / 10).toFixed(1).replace(".", ",");
  const targetRaw  = Math.min(d.total + 15, 100);
  const target     = (targetRaw / 10).toFixed(1).replace(".", ",");
  const currColor  = scoreColor(d.total);
  const tgtColor   = scoreColor(targetRaw);

  return `<div class="nb-card" style="margin-bottom:3.5mm">
    ${secTitle("Objectif du prochain bilan")}
    <div class="nb-row">
      <div class="nb-col">
        <div class="nb-lbl">Score actuel</div>
        <div class="nb-score" style="color:${currColor}">${current}<span class="nb-unit"> /10</span></div>
      </div>
      <div class="nb-arrow">→</div>
      <div class="nb-col">
        <div class="nb-lbl">Objectif</div>
        <div class="nb-score" style="color:${tgtColor}">${target}<span class="nb-unit"> /10</span></div>
      </div>
      <div class="nb-sep"></div>
      <div class="nb-col">
        <div class="nb-lbl">Prochain bilan</div>
        <div class="nb-delay">Dans 6 semaines</div>
      </div>
    </div>
  </div>`;
}

function signaturesBlock(d: BilanPdfData): string {
  const contact = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");
  return `<div class="signatures">
    <div class="sig-rule-row">
      <div class="sig-line"></div>
      <div class="sig-dia"></div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-row">
      <div class="sig-blocks">
        ${[
          { label: "Signature du coach",  name: d.coachSignature || d.coachName },
          { label: "Signature du client", name: d.clientSignature || d.clientName },
        ].map(s => `<div class="sig-block">
          <div class="sig-lbl">${esc(s.label)}</div>
          <div class="sig-underline"></div>
          <div class="sig-name">${esc(s.name)}</div>
        </div>`).join("")}
      </div>
      <div class="sig-brand">
        <div class="brand-row">
          <div class="brand-dia"></div>
          <span class="brand-name">${esc(d.cabinetName)}</span>
        </div>
        ${contact ? `<div class="brand-contact">${esc(contact)}</div>` : ""}
        <div class="brand-conf">Document confidentiel · ${esc(d.dateStr)}</div>
      </div>
    </div>
  </div>`;
}

// ─── CSS ─────────────────────────────────────────────────────────────────────

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

/* ══════════ HEADER — branding & identité ══════════ */

.doc-header{
  flex:0 0 28mm;
  background:linear-gradient(180deg,#FFFFFF 0%,#FAF8F4 100%);
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:0 12mm;
  border-bottom:1pt solid #C8A87A;
  position:relative;
}
.doc-header::after{
  content:'';
  position:absolute;bottom:-1pt;left:0;right:0;
  height:0.4pt;
  background:linear-gradient(90deg,transparent 5%,rgba(184,149,106,0.20) 40%,rgba(184,149,106,0.20) 60%,transparent 95%);
}
.header-brand{display:flex;align-items:center;gap:16pt;position:relative}
.header-brand::before{
  content:'';
  position:absolute;
  left:-10pt;top:50%;transform:translateY(-50%);
  width:310px;height:90px;
  border-radius:10pt;
  background:radial-gradient(ellipse at 35% 50%, rgba(184,149,106,0.07) 0%, transparent 65%);
  pointer-events:none;
}
.logo-img{
  height:90px;
  width:auto;
  max-width:320px;
  object-fit:contain;
  object-position:left center;
  display:block;
  flex-shrink:0;
  position:relative;
  filter:drop-shadow(0 0 14px rgba(184,149,106,0.20)) drop-shadow(0 1px 4px rgba(30,24,18,0.09));
}
.brand-sep{
  width:0.7pt;height:56px;
  background:linear-gradient(180deg,transparent,#C8BEA8 30%,#C8BEA8 70%,transparent);
  flex-shrink:0;
}
.brand-text{display:flex;flex-direction:column;gap:2pt}
.cabinet-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:20px;font-weight:700;
  color:#100C08;letter-spacing:-0.6px;
}
.cabinet-tagline{
  font-size:6px;font-weight:500;
  color:#C09A6C;letter-spacing:3px;
  text-transform:uppercase;
  margin-top:2pt;
}
.cabinet-sub{font-size:6.5px;color:#A89C8C;letter-spacing:0.2px;margin-top:1pt}
.header-right{
  text-align:right;
  display:flex;flex-direction:column;gap:2pt;
  border-left:0.5pt solid #EDE5DA;
  padding-left:12pt;
}
.header-date-lbl{
  font-size:5px;font-weight:600;
  color:#C09A6C;letter-spacing:3px;
  text-transform:uppercase;
}
.header-date-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:11px;font-weight:700;color:#1A1410;
  letter-spacing:-0.2px;
}

/* ══════════ HERO — client, identité, score ══════════ */

.hero{
  flex:0 0 65mm;
  display:flex;
  position:relative;
  background-color:#F7F4EF;
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"),
    radial-gradient(ellipse 70% 120% at 112% 50%, rgba(184,149,106,0.13) 0%, transparent 60%),
    radial-gradient(ellipse 45% 75% at -10% 100%, rgba(184,149,106,0.07) 0%, transparent 52%),
    linear-gradient(180deg, rgba(255,253,250,0.50) 0%, transparent 32%);
  background-size:200px 200px, auto, auto, auto;
  border-bottom:0.7pt solid #DDD5C8;
}
.hero-accent{
  width:5mm;flex-shrink:0;
  background:linear-gradient(180deg,#EAD9AE 0%,#B8956A 35%,#9A7A52 80%,#7A5A38 100%);
}
.hero-main{
  flex:1;
  display:flex;
  align-items:center;
  padding:0 10mm 0 9mm;
  gap:0;
}
.hero-text{
  flex:1;min-width:0;
  display:flex;flex-direction:column;
  gap:0;
  padding-right:6mm;
}
.hero-overline{
  font-size:5.5px;font-weight:700;
  color:#B8956A;letter-spacing:4px;
  text-transform:uppercase;
  margin-bottom:6pt;
}
.hero-name{
  font-family:'Playfair Display',Georgia,'Times New Roman',serif;
  font-size:74px;font-weight:800;
  color:#0D0905;
  line-height:0.82;
  letter-spacing:-4px;
  margin-bottom:14pt;
  text-shadow:0 1px 6px rgba(20,14,9,0.08);
}
.hero-coach-row{
  display:flex;align-items:center;gap:9pt;
  padding-top:10pt;
  border-top:0.6pt solid #E4DCD4;
}
.coach-avatar{
  width:36px;height:36px;border-radius:50%;
  background:#1E1812;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  border:1.5pt solid #B8956A;
}
.coach-initials{
  font-family:'Playfair Display',Georgia,serif;
  font-size:11px;font-weight:700;color:#E8D5A8;
  line-height:1;
}
.coach-info{display:flex;flex-direction:column;gap:2.5pt;min-width:0}
.coach-name-txt{
  font-size:7.5px;font-weight:700;
  color:#4A3C30;letter-spacing:0.3px;
}
.coach-quote{
  font-family:'Playfair Display',Georgia,serif;
  font-size:9px;font-style:italic;
  color:#8A7A68;line-height:1.4;
}
.hero-score{
  flex-shrink:0;
  display:flex;flex-direction:column;
  align-items:center;
  gap:5pt;
  padding-left:8mm;
  border-left:0.8pt solid #E0D6CA;
}
.hero-score-lbl{
  font-size:7px;font-weight:700;
  text-transform:uppercase;letter-spacing:1.8px;
  text-align:center;
}

/* ══════════ BODY page 1 ══════════ */

.body{
  flex:1;
  padding:7mm 12mm 5mm;
  display:flex;flex-direction:column;
  gap:5mm;
  overflow:hidden;
}

.sec-head{display:flex;align-items:center;margin-bottom:11pt}
.sec-label{
  font-size:5px;font-weight:700;
  color:#A89070;letter-spacing:3px;
  text-transform:uppercase;white-space:nowrap;
}
.sec-rule{flex:1;height:0.4pt;background:linear-gradient(90deg,#E0D6CA,transparent);margin-left:10pt}

/* Axes */
.axes-card{
  flex-shrink:0;
  background:#FDFCF9;
  border-radius:11pt;
  padding:13pt 16pt 11pt;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 16pt rgba(30,24,18,0.07);
  border:0.5pt solid rgba(184,149,106,0.10);
}
.axis-row{
  display:flex;align-items:center;
  padding:5.5pt 0;gap:12pt;
}
.axis-row+.axis-row{border-top:0.4pt solid #F2EBE2}
.axis-lbl{
  font-size:6.5px;font-weight:700;
  color:#9A8C80;letter-spacing:1px;
  text-transform:uppercase;
  width:60pt;flex-shrink:0;
}
.axis-track{
  flex:1;height:4pt;border-radius:99pt;
  background:#EDE5DA;overflow:hidden;
}
.axis-fill{height:4pt;border-radius:99pt}
.axis-num{
  font-family:'Playfair Display',Georgia,serif;
  font-size:14px;font-weight:700;
  width:20pt;text-align:right;flex-shrink:0;line-height:1;
}
.axis-den{font-size:7px;color:#B8A898;width:16pt;flex-shrink:0;line-height:1}

/* Main row */
.main-row{display:flex;gap:7mm;flex:0 1 auto;min-height:0}
.radar-card{
  flex:1;
  background:#FDFCF9;
  border-radius:11pt;
  padding:14pt 0 8pt;
  display:flex;flex-direction:column;
  align-items:center;overflow:hidden;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 16pt rgba(30,24,18,0.07);
  border:0.5pt solid rgba(184,149,106,0.10);
}
.radar-title{padding:0 13pt;width:100%;margin-bottom:2pt}

.prio-col{width:63mm;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden}
.pcard{border-radius:8pt;padding:11pt 13pt;margin-bottom:6pt}
.pnum{font-size:8.5px;font-weight:700;letter-spacing:0.5px;margin-bottom:4pt}
.gold-p{color:#B8956A}.taupe-p{color:#9A8C80}.muted-p{color:#B8A898}
.p1c{background:#1E1812;border-left:3.5pt solid #B8956A;box-shadow:0 1pt 6pt rgba(30,24,18,0.18)}
.p1n{
  font-family:'Playfair Display',Georgia,serif;
  font-size:12.5px;font-weight:700;
  color:#F5EFE5;line-height:1.3;
}
.p2c{background:#FDFCF9;border:0.6pt solid #E4DCD4;box-shadow:0 1pt 4pt rgba(30,24,18,0.05)}
.p2n{font-size:11px;font-weight:700;color:#1A1410;line-height:1.3}
.p3c{background:#F5F1EB;border:0.5pt solid #E0D6CA}
.p3n{font-size:10.5px;font-weight:600;color:#6A5E52;line-height:1.3}

/* Tests */
.tests-card{
  flex-shrink:1;min-height:0;
  background:#FDFCF9;
  border-radius:11pt;
  overflow:hidden;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 4pt 16pt rgba(30,24,18,0.07);
  border:0.5pt solid rgba(184,149,106,0.10);
}
.tests-hd{padding:13pt 16pt 0}
.test-row{
  display:flex;align-items:stretch;
  padding:9pt 16pt;
}
.test-row+.test-row{border-top:0.4pt solid #F2EBE2}
.test-bar{
  width:3pt;border-radius:99pt;
  margin-right:12pt;flex-shrink:0;
  align-self:stretch;
}
.test-body{flex:1}
.test-top{
  display:flex;align-items:center;
  justify-content:space-between;margin-bottom:2pt;
}
.test-name{font-size:10px;font-weight:700;color:#1A1410}
.test-badge{
  font-size:6px;font-weight:700;
  padding:2pt 8pt;border-radius:99pt;
  border-width:0.6pt;border-style:solid;
  letter-spacing:0.8px;text-transform:uppercase;
}
.test-obs{
  font-family:'Playfair Display',Georgia,serif;
  font-size:8.5px;font-style:italic;
  color:#9A8C80;line-height:1.55;
}

/* Footer */
.footer{
  flex:0 0 9mm;
  background:#FDFCF9;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 12mm;
  border-top:0.6pt solid #E0D6CA;
}
.footer-text{font-size:6.5px;color:#B8A898;letter-spacing:0.3px}
.footer-dot{font-size:7px;color:#B8956A}

/* ══════════ PAGE 2 ══════════ */

.mini-header{
  flex:0 0 13mm;
  background:#1E1812;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 12mm;
  border-bottom:1pt solid rgba(184,149,106,0.3);
}
.mini-left{display:flex;align-items:center;gap:9pt}
.mini-dia{
  width:4.5pt;height:4.5pt;background:#B8956A;
  transform:rotate(45deg);flex-shrink:0;
}
.mini-client{
  font-family:'Playfair Display',Georgia,serif;
  font-size:9.5px;font-weight:700;color:#F5EFE5;
}
.mini-sub{font-size:7px;color:#6A5A48}
.mini-pg{font-size:6.5px;color:#6A5A48;letter-spacing:0.4px}

.body2{
  flex:1;
  padding:7mm 12mm 5mm;
  display:flex;flex-direction:column;
  overflow:hidden;
}

.two-col{display:flex;gap:6mm;flex-shrink:1;min-height:0;margin-bottom:3.5mm}
.flex1{flex:1}
.card{
  background:#FDFCF9;
  border-radius:10pt;
  padding:13pt 14pt;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 3pt 12pt rgba(30,24,18,0.06);
  border:0.5pt solid rgba(184,149,106,0.09);
  flex-shrink:1;min-height:0;overflow:hidden;
}

/* Context */
.ctx-grid{display:flex;flex-wrap:wrap;gap:10pt 16pt}
.ctx-key{font-size:6px;font-weight:700;color:#B8A898;letter-spacing:1.3px;margin-bottom:2pt;text-transform:uppercase}
.ctx-val{font-size:10.5px;font-weight:700;color:#1A1410}

/* Subjectif */
.subj-row{display:flex;gap:13pt;flex-wrap:wrap;align-items:flex-start}
.subj-item{display:flex;flex-direction:column}
.subj-lbl{font-size:6px;font-weight:700;color:#B8A898;letter-spacing:1.3px;margin-bottom:3pt;text-transform:uppercase}
.subj-nums{display:flex;align-items:flex-end;margin-bottom:4pt}
.subj-val{font-size:20px;font-weight:800;line-height:1}
.subj-max{font-size:8px;color:#B8A898;margin-bottom:1pt;margin-left:1.5pt}
.bar-track{height:3pt;border-radius:99pt;background:#EDE5DA}
.bar-fill{height:3pt;border-radius:99pt}

/* Analyse */
.analysis-row{display:flex;gap:16pt}
.analysis-sub{font-size:6.5px;font-weight:700;color:#9A8C80;margin-bottom:6pt;text-transform:uppercase;letter-spacing:0.5px}
.chip-row{display:flex;flex-wrap:wrap;gap:0}
.chip{
  font-size:7.5px;font-weight:600;
  padding:2.5pt 8pt;border-radius:99pt;
  border-width:0.6pt;border-style:solid;
  margin-right:4pt;margin-bottom:4pt;
  display:inline-block;
}
.chip-lim{color:#8A2828;background:#FEF4F4;border-color:#EEB8B8}
.chip-rec{color:#4A3C30;background:#EDE3D0;border-color:#E2D8CC}

/* Action plan */
.ap-card{
  border-radius:9pt;overflow:hidden;
  background:#FDFCF9;
  box-shadow:0 1pt 5pt rgba(30,24,18,0.06);
  flex-shrink:1;min-height:0;max-height:36mm;
}
.ap-pris{display:flex}
.ap-p1{flex:1;background:#1E1812;padding:10pt 12pt;border-left:3pt solid #B8956A;border-right:0.5pt solid rgba(255,255,255,0.06)}
.ap-p2{flex:1;background:#FAF7F2;padding:10pt 11pt;border-right:0.5pt solid #E4DCD4}
.ap-p3{flex:1;background:#F5F1EB;padding:10pt 11pt}
.ap-rk{font-size:5.5px;font-weight:700;letter-spacing:2px;margin-bottom:4pt;text-transform:uppercase}
.ap-gold{color:#B8956A}.ap-taupe{color:#9A8C80}.ap-muted{color:#B8A898}
.ap-p1n{font-family:'Playfair Display',Georgia,serif;font-size:12px;font-weight:700;color:#F5EFE5;line-height:1.35}
.ap-p2n{font-size:11px;font-weight:700;color:#1A1410;line-height:1.35}
.ap-p3n{font-size:10.5px;font-weight:600;color:#6A5E52;line-height:1.35}
.ap-goals{display:flex;background:#FAF7F2;border-top:0.5pt solid #E4DCD4}
.ap-gb{flex:1;padding:9pt 12pt}
.ap-gsep{border-left:0.5pt solid #E4DCD4}
.ap-gk{font-size:6px;font-weight:700;color:#B8A898;letter-spacing:1.3px;margin-bottom:3pt;text-transform:uppercase}
.ap-gv{font-size:9.5px;color:#1A1410;line-height:1.6;font-weight:500}
.ap-sched{display:flex;background:#FDFCF9;border-top:0.5pt solid #E4DCD4}
.ap-si{flex:1;padding:9pt 12pt}
.ap-ss{border-right:0.5pt solid #E4DCD4}
.ap-sk{font-size:6px;font-weight:700;color:#B8A898;letter-spacing:1.3px;margin-bottom:3pt;text-transform:uppercase}
.ap-sv{font-size:9.5px;font-weight:600;color:#1A1410;line-height:1.5}

/* Notes */
.notes-card{border-left:3pt solid #B8956A!important}
.note-key{font-size:6px;font-weight:700;color:#9A8C80;letter-spacing:0.8px;margin-bottom:3pt;text-transform:uppercase}
.note-text{font-size:9.5px;color:#1A1410;line-height:1.65}

/* Signatures */
.signatures{flex-shrink:0;margin-top:4mm}
.sig-rule-row{display:flex;align-items:center;margin-bottom:14pt}
.sig-line{flex:1;height:0.5pt;background:linear-gradient(90deg,transparent,#DDD5C8 25%,#DDD5C8 75%,transparent)}
.sig-dia{
  width:5pt;height:5pt;background:#B8956A;
  transform:rotate(45deg);margin:0 9pt;flex-shrink:0;
}
.sig-row{display:flex;justify-content:space-between;align-items:flex-end}
.sig-blocks{display:flex;gap:44pt}
.sig-lbl{font-size:6.5px;font-weight:600;color:#A89080;letter-spacing:1px;text-transform:uppercase;margin-bottom:18pt}
.sig-underline{width:108pt;height:0.6pt;background:linear-gradient(90deg,#C8BEA8,#EDE5DA);margin-bottom:5pt}
.sig-name{font-size:9px;font-weight:700;color:#4A3C30;letter-spacing:0.2px}
.sig-brand{text-align:right}
.brand-row{display:flex;align-items:center;justify-content:flex-end;margin-bottom:5pt;gap:7pt}
.brand-dia{width:3.5pt;height:3.5pt;background:#B8956A;transform:rotate(45deg);flex-shrink:0}
.brand-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:11px;font-weight:700;color:#1A1410;letter-spacing:-0.3px;
}
.brand-contact{font-size:6.5px;color:#9A8C80;margin-bottom:3pt;letter-spacing:0.1px}
.brand-conf{font-size:5.5px;color:#B8A898;letter-spacing:0.6px;text-transform:uppercase}

/* ══════════ SCORE ZONE (client) ══════════ */

.hero-score-zone{
  font-family:'Playfair Display',Georgia,serif;
  font-size:9.5px;font-weight:700;
  text-align:center;letter-spacing:-0.1px;
}

/* ══════════ FRÉQUENCE RECOMMANDÉE ══════════ */

.freq-badge{
  border-radius:6pt;
  background:#1E1812;
  padding:8pt 11pt;
  margin-top:2pt;
  border-left:3pt solid #B8956A;
  flex-shrink:1;
}
.freq-lbl{
  font-size:5px;font-weight:700;
  color:#B8956A;letter-spacing:2.5px;
  text-transform:uppercase;margin-bottom:3pt;
}
.freq-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:11px;font-weight:700;color:#F5EFE5;line-height:1.3;
}

/* ══════════ OBSERVATION & POURQUOI ══════════ */

.obs-card{border-left:3pt solid #B8956A!important;max-height:26mm;overflow:hidden}
.obs-text{
  font-family:'Playfair Display',Georgia,serif;
  font-size:10px;font-style:italic;
  color:#2A2018;line-height:1.78;
}
.why-card{max-height:26mm;overflow:hidden}
.why-text{font-size:9.5px;color:#3A3028;line-height:1.72}

/* ══════════ PROJECTION 6 SEMAINES ══════════ */

.proj-card{
  background:#FDFCF9;
  border-radius:9pt;
  padding:11pt 14pt 9pt;
  box-shadow:0 1pt 5pt rgba(30,24,18,0.06);
  margin-bottom:3.5mm;
  flex-shrink:1;min-height:0;overflow:hidden;max-height:30mm;
}
.proj-steps{display:flex;align-items:flex-start;gap:0;margin-bottom:8pt}
.proj-step{flex:1;display:flex;flex-direction:column;align-items:flex-start;position:relative}
.proj-connector{
  flex:0 0 20pt;
  display:flex;align-items:flex-start;
  padding-top:8pt;
  justify-content:center;
}
.proj-connector-line{
  width:100%;height:0.5pt;
  background:linear-gradient(90deg,#D4C4A8 0%,#B8956A 50%,#D4C4A8 100%);
}
.proj-num{
  width:20px;height:20px;border-radius:50%;
  background:#1E1812;
  font-family:'Playfair Display',Georgia,serif;
  font-size:8.5px;font-weight:700;color:#E8D5A8;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;margin-bottom:5pt;
  border:1pt solid #B8956A;
}
.proj-title{
  font-family:'Playfair Display',Georgia,serif;
  font-size:11px;font-weight:700;color:#1A1410;margin-bottom:2pt;
}
.proj-week{font-size:5px;font-weight:700;color:#B8956A;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:3pt}
.proj-desc{font-size:7.5px;color:#6A5E52;line-height:1.5;padding-right:6pt}
.proj-goal{
  font-size:8.5px;color:#4A3C30;line-height:1.5;
  padding:5pt 9pt;background:#F5F0E8;border-radius:5pt;
  border-left:2.5pt solid #B8956A;margin-bottom:7pt;
}
.proj-goal-lbl{font-weight:700;color:#B8956A}
.proj-footer{
  display:flex;align-items:center;justify-content:space-between;
  padding-top:7pt;border-top:0.5pt solid #EDE5DA;
}
.proj-next{font-size:5.5px;font-weight:700;color:#9A8C80;text-transform:uppercase;letter-spacing:1px}
.proj-next-val{font-size:8.5px;font-weight:700;color:#B8956A}

/* ══════════ OBJECTIF PROCHAIN BILAN ══════════ */

.nb-card{
  background:#FDFCF9;
  border-radius:9pt;
  padding:10pt 14pt 9pt;
  box-shadow:0 1pt 5pt rgba(30,24,18,0.06);
  flex-shrink:0;
  border:0.5pt solid rgba(184,149,106,0.10);
}
.nb-row{display:flex;align-items:flex-end;gap:0}
.nb-col{display:flex;flex-direction:column;align-items:center;flex:1}
.nb-lbl{font-size:5.5px;font-weight:700;color:#B8A898;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5pt;text-align:center}
.nb-score{
  font-family:'Playfair Display',Georgia,serif;
  font-size:22px;font-weight:800;line-height:1;
}
.nb-unit{font-size:10px;font-weight:400;color:#B8A898;margin-left:1pt}
.nb-delay{
  font-family:'Playfair Display',Georgia,serif;
  font-size:13px;font-weight:700;color:#4A3C30;text-align:center;line-height:1.2;
}
.nb-arrow{font-size:16px;color:#B8956A;padding:0 6pt 3pt;flex-shrink:0}
.nb-sep{width:0.5pt;height:30px;background:linear-gradient(180deg,transparent,#DDD5C8 30%,#DDD5C8 70%,transparent);flex-shrink:0;margin:0 10pt 3pt}

/* ══════════ CONSEILS RÉCUPÉRATION ══════════ */

.rec-card{
  background:#FDFCF9;
  border-radius:10pt;
  padding:12pt 14pt 11pt;
  box-shadow:0 1pt 3pt rgba(30,24,18,0.04),0 3pt 12pt rgba(30,24,18,0.06);
  border:0.5pt solid rgba(184,149,106,0.09);
  margin-bottom:3.5mm;
  flex-shrink:1;min-height:0;overflow:hidden;
}
.rec-grid{display:flex;flex-wrap:wrap;gap:9pt 14pt}
.rec-item{display:flex;align-items:flex-start;gap:8pt;width:calc(50% - 7pt)}
.rec-icon{
  width:18px;height:18px;border-radius:50%;flex-shrink:0;
  background:linear-gradient(135deg,#F5EFE5,#EDE5D8);
  border:0.7pt solid rgba(184,149,106,0.3);
  display:flex;align-items:center;justify-content:center;
  margin-top:0.5pt;
}
.rec-icon-txt{font-size:8px;color:#B8956A;font-weight:700}
.rec-item-body{min-width:0}
.rec-title{font-size:7.5px;font-weight:700;color:#1A1410;margin-bottom:2pt;letter-spacing:0.1px}
.rec-desc{font-size:7px;color:#7A6E62;line-height:1.6}

/* ══════════ COACH MESSAGE ══════════ */

.coach-msg-card{
  display:flex;
  border-radius:9pt;overflow:hidden;
  background:#1E1812;
  flex-shrink:1;min-height:0;max-height:34mm;
  margin-bottom:3.5mm;
  box-shadow:0 2pt 10pt rgba(30,24,18,0.22);
}
.coach-msg-accent{
  width:4mm;flex-shrink:0;
  background:linear-gradient(180deg,#E8D5A8 0%,#B8956A 50%,#9A7A52 100%);
}
.coach-msg-body{flex:1;padding:9pt 13pt 8pt}
.coach-msg-header{
  display:flex;align-items:center;gap:8pt;
  margin-bottom:6pt;padding-bottom:5pt;
  border-bottom:0.5pt solid rgba(184,149,106,0.16);
}
.coach-msg-avatar{
  width:26px;height:26px;border-radius:50%;flex-shrink:0;
  background:rgba(184,149,106,0.12);
  border:1pt solid rgba(184,149,106,0.35);
  display:flex;align-items:center;justify-content:center;
}
.coach-msg-initials{
  font-family:'Playfair Display',Georgia,serif;
  font-size:9px;font-weight:700;color:#E8D5A8;line-height:1;
}
.coach-msg-name{font-size:7.5px;font-weight:700;color:#B8956A;letter-spacing:0.3px}
.coach-msg-title{font-size:5.5px;color:#5A4A38;letter-spacing:1.5px;text-transform:uppercase;margin-top:1pt}
.coach-msg-quote-wrap{position:relative;overflow:hidden}
.coach-msg-deco{
  position:absolute;top:0;left:-1pt;
  font-family:'Playfair Display',Georgia,serif;
  font-size:54px;font-weight:800;
  color:rgba(184,149,106,0.11);
  line-height:0.85;pointer-events:none;user-select:none;
}
.coach-msg-text{
  font-family:'Playfair Display',Georgia,serif;
  font-size:9.5px;font-style:italic;
  color:#E8DDD0;line-height:1.62;
  padding-left:4pt;
  margin-bottom:5pt;position:relative;
}
.coach-msg-sig{
  font-size:6.5px;font-weight:600;
  color:rgba(184,149,106,0.72);letter-spacing:0.3px;
  padding-top:5pt;border-top:0.5pt solid rgba(184,149,106,0.18);
}
.coach-msg-contact{
  font-size:5.5px;color:rgba(184,149,106,0.42);
  letter-spacing:1px;text-transform:uppercase;margin-top:3pt;
}
`;

function recoveryCard(): string {
  const tips = [
    { icon: "◎", title: "Hydratation", desc: "1,5 à 2 L d'eau par jour. Indispensable à la récupération musculaire et articulaire." },
    { icon: "◑", title: "Sommeil récupérateur", desc: "7–9 h par nuit. La reconstruction tissulaire se produit en phase de sommeil profond." },
    { icon: "◌", title: "Mobilité quotidienne", desc: "10 min chaque matin : Cat-Cow, rotations thoraciques, cercles de chevilles." },
    { icon: "◈", title: "Nutrition & protéines", desc: "1,4–1,8 g/kg de protéines pour soutenir la récupération entre chaque séance." },
  ];
  return `<div class="rec-card">
    ${secTitle("Conseils récupération")}
    <div class="rec-grid">
      ${tips.map(t => `<div class="rec-item">
        <div class="rec-icon"><span class="rec-icon-txt">${t.icon}</span></div>
        <div class="rec-item-body">
          <div class="rec-title">${t.title}</div>
          <div class="rec-desc">${t.desc}</div>
        </div>
      </div>`).join("")}
    </div>
  </div>`;
}

function projectionCard(d: BilanPdfData): string {
  const steps = [
    { week: "Sem. 1–2", title: "Maintenant"   },
    { week: "Sem. 3–4", title: "Ensuite"       },
    { week: "Sem. 5–6", title: "Objectif visé" },
  ];

  const stepsHtml = steps.map((s, i) => `
    <div class="proj-step">
      <div class="proj-num">${i + 1}</div>
      <div class="proj-title">${s.title}</div>
      <div class="proj-week">${s.week}</div>
    </div>
    ${i < 2 ? '<div class="proj-connector"><div class="proj-connector-line"></div></div>' : ""}
  `).join("");

  const goalHtml = (d.mainGoal || d.concreteGoal)
    ? `<div class="proj-goal"><span class="proj-goal-lbl">Objectif :</span> ${esc(d.mainGoal || d.concreteGoal)}</div>`
    : "";

  return `<div class="proj-card">
    ${secTitle("Projection 6 semaines")}
    <div class="proj-steps">${stepsHtml}</div>
    ${goalHtml}
  </div>`;
}

function coachMessageCard(d: BilanPdfData): string {
  if (!d.importantNotes) return "";

  const sigImg = d.coachSignature && d.coachSignature.startsWith("data:image")
    ? `<img src="${d.coachSignature}" style="height:16px;max-width:90px;object-fit:contain;display:block;margin-bottom:4pt;filter:invert(1);opacity:0.65" alt="">`
    : "";

  return `<div class="coach-msg-card">
    <div class="coach-msg-accent"></div>
    <div class="coach-msg-body">
      <div class="coach-msg-header">
        <div class="coach-msg-avatar">
          <span class="coach-msg-initials">${coachInitials(d.coachName)}</span>
        </div>
        <div>
          <div class="coach-msg-name">${esc(d.coachName)}</div>
          <div class="coach-msg-title">Coach mouvement · ${esc(d.cabinetName)}</div>
        </div>
      </div>
      <div class="coach-msg-quote-wrap">
        <span class="coach-msg-deco">"</span>
        <div class="coach-msg-text">${esc(d.importantNotes)}</div>
      </div>
      ${sigImg}<div class="coach-msg-sig">— ${esc(d.coachName)} · ${esc(d.dateStr)}</div>
      ${d.contactLine ? `<div class="coach-msg-contact">${esc(d.contactLine)}</div>` : ""}
    </div>
  </div>`;
}

// ─── Générateur principal ─────────────────────────────────────────────────────

export function generateBilanHtml(d: BilanPdfData, mode: "client" | "coach" = "coach"): string {
  const isClient = mode === "client";
  const color    = scoreColor(d.total);
  const label    = isClient ? "Indice de mouvement" : scoreLabel(d.total);
  const zone     = isClient ? clientScoreZone(d.total) : null;
  const footerTxt = [d.contactLine, d.addressLine].filter(Boolean).join("  ·  ");

  const hasContext    = !!(d.workType || d.sportPracticed || d.sittingHoursPerDay !== null || d.painZones);
  const hasSubjective = [d.energyScore, d.stressScore, d.sleepScore, d.painScore].some(v => v !== null);
  const hasActionPlan = !!(d.mainGoal || d.concreteGoal || d.frequency || d.nextAction);
  const hasNotes      = !!(d.painEvolution || d.oldInjuries || d.operations);

  // Logo dans le header (fond clair) — toujours visible
  const brandHtml = `<img class="logo-img" src="${esc(d.logoSrc)}" alt="${esc(d.cabinetName)}"
    onerror="this.style.display='none';this.nextElementSibling.style.display='none'">
    <div class="brand-sep"></div>
    <div class="brand-text">
      <span class="cabinet-name">${esc(d.cabinetName)}</span>
      <span class="cabinet-tagline">Mouvement · Performance · Bien-être</span>
      ${d.contactLine ? `<span class="cabinet-sub">${esc(d.contactLine)}</span>` : ""}
    </div>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Bilan Mouvement — ${esc(d.clientName)}</title>
  <style>${CSS}</style>
</head>
<body>

<!-- ══════════════════════════════ PAGE 1 ══════════════════════════════ -->
<div class="page">

  <!-- HEADER — branding, logo, identité -->
  <div class="doc-header">
    <div class="header-brand">${brandHtml}</div>
    <div class="header-right">
      <span class="header-date-lbl">Bilan du</span>
      <span class="header-date-val">${esc(d.dateStr)}</span>
    </div>
  </div>

  <!-- HERO — nom client, coach, score, fond clair -->
  <div class="hero">
    <div class="hero-accent"></div>
    <div class="hero-main">
      <div class="hero-text">
        <div class="hero-overline">Bilan mouvement personnalisé</div>
        <div class="hero-name">${esc(d.clientName)}</div>
        <div class="hero-coach-row">
          <div class="coach-avatar">
            <span class="coach-initials">${coachInitials(d.coachName)}</span>
          </div>
          <div class="coach-info">
            <span class="coach-name-txt">${esc(d.coachName)}</span>
          </div>
        </div>
      </div>
      <div class="hero-score">
        ${gaugeSvg(d.total, mode)}
        <div class="hero-score-lbl" style="color:${isClient ? "#B8956A" : color}">${esc(label)}</div>
        ${zone ? `<div class="hero-score-zone" style="color:${zone.color}">${esc(zone.label)}</div>` : ""}
      </div>
    </div>
  </div>

  <!-- BODY -->
  <div class="body">

    ${axisSection(d.axes)}

    <div class="main-row">
      <div class="radar-card">
        <div class="radar-title">${secTitle("Cartographie du mouvement")}</div>
        ${radarSvg(d.axes)}
      </div>
      ${d.topPriorities.length ? priorityCards(d.topPriorities, d.frequency) : ""}
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <span class="footer-text">${esc(d.cabinetName)}</span>
    <span class="footer-dot">◆</span>
    <span class="footer-text">${esc(footerTxt || `Document confidentiel · ${d.dateStr}`)}</span>
  </div>
</div>

<!-- ══════════════════════════════ PAGE 2 ══════════════════════════════ -->
<div class="page">

  <!-- MINI HEADER -->
  <div class="mini-header">
    <div class="mini-left">
      <div class="mini-dia"></div>
      <span class="mini-client">${esc(d.clientName)}</span>
      <span class="mini-sub">· Analyse &amp; plan d'action</span>
    </div>
    <span class="mini-pg">${esc(d.dateStr)} · Page 2 / 2</span>
  </div>

  <!-- BODY PAGE 2 -->
  <div class="body2">

    ${!isClient && d.tests.length ? `<div style="margin-bottom:3.5mm">${testsList(d.tests, mode)}</div>` : ""}

    ${!isClient && (hasContext || hasSubjective) ? `<div class="two-col">
      ${contextCard(d)}
      ${subjectiveCard(d)}
    </div>` : ""}

    ${!isClient ? observationsCard(d) : ""}

    ${hasActionPlan ? actionPlanCard(d)  : ""}
    ${hasNotes      ? notesCard(d, mode) : ""}

    ${projectionCard(d)}
    ${nextBilanCard(d)}
    ${coachMessageCard(d)}

    ${signaturesBlock(d)}

  </div>

  <!-- FOOTER PAGE 2 -->
  <div class="footer">
    <span class="footer-text">${esc(d.cabinetName)}</span>
    <span class="footer-dot">◆</span>
    <span class="footer-text">${esc(footerTxt || `Document confidentiel · ${d.dateStr}`)}</span>
  </div>
</div>

</body>
</html>`;
}
