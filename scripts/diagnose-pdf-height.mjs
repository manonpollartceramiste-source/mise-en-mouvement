// Diagnostic script — mesure les hauteurs réelles de chaque bloc page 2

import { chromium } from "playwright-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ── Mock data minimal ──────────────────────────────────────────────────────────
const mockData = {
  clientName: "Sophie Martin",
  cabinetName: "Mise en Mouvement",
  logoSrc: "http://localhost:3000/logo.png",
  hasCustomLogo: false,
  contactLine: "06 12 34 56 78 · contact@example.com",
  addressLine: "12 rue de la Paix, 75001 Paris",
  dateStr: "2 juin 2026",
  total: 62,
  axes: [
    { label: "Mobilité",     value: 14, max: 20 },
    { label: "Stabilité",    value: 12, max: 20 },
    { label: "Force",        value: 13, max: 20 },
    { label: "Posture",      value: 11, max: 20 },
    { label: "Coordination", value: 12, max: 20 },
  ],
  activeLim: ["Rester assis longtemps", "Raideurs au réveil"],
  activeRec: ["Mobilité", "Renforcement", "Étirements"],
  topPriorities: ["Mobilité", "Renforcement", "Étirements"],
  tests: [
    { label: "Squat",                    score: 1, observation: "Légère antéversion du bassin" },
    { label: "Équilibre unipodal",       score: 2 },
    { label: "Bras au-dessus de la tête", score: 1, observation: "Limitation épaule droite" },
    { label: "Hip hinge",               score: 2 },
  ],
  energyScore: 7,
  stressScore: 4,
  sleepScore: 6,
  painScore: 3,
  workType: "assis",
  sportPracticed: "Natation",
  sittingHoursPerDay: 8,
  painZones: "Lombaires",
  frequency: "2x/semaine",
  motivation: "forte",
  engagement: "régulier",
  mainGoal: "Réduire les douleurs lombaires",
  concreteGoal: "Marcher 30 min sans douleur",
  nextAction: "Commencer les exercices de mobilité lombaire dès cette semaine",
  importantNotes: null,
  painEvolution: null,
  oldInjuries: null,
  operations: null,
  coachName: "Dorian Hébert",
  coachRole: null,
  coachPhotoSrc: null,
  qrCodeDataUrl: null,
  bodyComposition: {
    weightKg: 68.5,
    fatPct: 24.2,
    musclePct: 38.1,
    waterPct: 55.0,
    boneMassKg: null,
    visceralFat: null,
    bmrKcal: null,
    metabolicAge: null,
    segArmRight: null,
    segArmLeft: null,
    segLegRight: null,
    segLegLeft: null,
    segTrunk: null,
  },
  zonePriorities: {
    lombaires: "forte",
    hanches: "surveillance",
    cervicales: "surveillance",
  },
};

// ── Génération HTML ────────────────────────────────────────────────────────────
const dir = fileURLToPath(new URL("../lib/pdf", import.meta.url));
// On charge le TS compilé via tsx
const { generateBilanHtml } = await import("../lib/pdf/bilan-html.ts");
const html = generateBilanHtml(mockData, "client");

// Sauvegarde pour inspection manuelle
fs.writeFileSync(path.join(dir, "_debug.html"), html, "utf-8");
console.log("HTML sauvegardé → lib/pdf/_debug.html");

// ── Mesure Playwright ─────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 794, height: 1200 } });
await page.setContent(html, { waitUntil: "networkidle" });

// Mesure chaque .page
const pages = await page.evaluate(() => {
  return Array.from(document.querySelectorAll(".page")).map((el, i) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      index: i + 1,
      width: Math.round(r.width),
      height: Math.round(r.height),
      computedHeight: cs.height,
      overflow: cs.overflow,
    };
  });
});

console.log("\n=== PAGES ===");
pages.forEach(p => {
  console.log(`Page ${p.index}: ${p.width}×${p.height}px  |  computedHeight=${p.computedHeight}  overflow=${p.overflow}`);
});

// Mesure les blocs enfants directs de la page 2
const page2children = await page.evaluate(() => {
  const pages = document.querySelectorAll(".page");
  const p2 = pages[1];
  if (!p2) return [];
  return Array.from(p2.children).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      classes: el.className,
      height: Math.round(r.height),
      computedHeight: cs.height,
      flex: cs.flex,
      minHeight: cs.minHeight,
    };
  });
});

console.log("\n=== ENFANTS DIRECTS PAGE 2 ===");
page2children.forEach(c => {
  console.log(`  <${c.tag} class="${c.classes}">  height=${c.height}px  flex=${c.flex}  min-height=${c.minHeight}`);
});

// Mesure p2-body et ses enfants
const bodyChildren = await page.evaluate(() => {
  const body = document.querySelector(".p2-body");
  if (!body) return { body: null, children: [] };
  const br = body.getBoundingClientRect();
  const cs = getComputedStyle(body);
  const bodyInfo = {
    height: Math.round(br.height),
    computedHeight: cs.height,
    flex: cs.flex,
    flexGrow: cs.flexGrow,
    minHeight: cs.minHeight,
    alignItems: cs.alignItems,
  };
  const children = Array.from(body.children).map(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      tag: el.tagName,
      classes: el.className,
      height: Math.round(r.height),
      flex: s.flex,
      flexGrow: s.flexGrow,
      minHeight: s.minHeight,
      overflow: s.overflow,
    };
  });
  return { body: bodyInfo, children };
});

console.log("\n=== .p2-body ===");
if (bodyChildren.body) {
  const b = bodyChildren.body;
  console.log(`  height=${b.height}px  flex=${b.flex}  flex-grow=${b.flexGrow}  min-height=${b.minHeight}  align-items=${b.alignItems}`);
}
console.log("\n=== ENFANTS DE .p2-body ===");
bodyChildren.children.forEach(c => {
  console.log(`  <${c.tag} class="${c.classes}">  height=${c.height}px  flex=${c.flex}  flex-grow=${c.flexGrow}  min-height=${c.minHeight}  overflow=${c.overflow}`);
});

// Mesure tous les éléments dans p2-left
const leftChildren = await page.evaluate(() => {
  const left = document.querySelector(".p2-left");
  if (!left) return { info: null, children: [] };
  const r = left.getBoundingClientRect();
  const s = getComputedStyle(left);
  const info = {
    height: Math.round(r.height),
    flex: s.flex,
    flexGrow: s.flexGrow,
    minHeight: s.minHeight,
  };
  const children = Array.from(left.children).map(el => {
    const cr = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      classes: el.className,
      height: Math.round(cr.height),
      marginTop: cs.marginTop,
      flex: cs.flex,
    };
  });
  return { info, children };
});

console.log("\n=== .p2-left ===");
if (leftChildren.info) {
  console.log(`  height=${leftChildren.info.height}px  flex=${leftChildren.info.flex}  flex-grow=${leftChildren.info.flexGrow}  min-height=${leftChildren.info.minHeight}`);
}
console.log("  Enfants :");
leftChildren.children.forEach(c => {
  console.log(`    <${c.tag} class="${c.classes}">  height=${c.height}px  margin-top=${c.marginTop}`);
});

await browser.close();
console.log("\nDiagnostic terminé.");
