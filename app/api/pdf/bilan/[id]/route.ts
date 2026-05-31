import { getOsProfileWithRole, getAssessmentById, getProfileById } from "@/lib/supabase/os-server";
import { loadSettings } from "@/lib/content/settings.server";
import { loadImages } from "@/lib/content/images.server";
import { generateBilanHtml, type BilanPdfData } from "@/lib/pdf/bilan-html";
import type { AssessmentTestEntry } from "@/lib/os/types";

// ─── Route config ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Label maps ───────────────────────────────────────────────────────────────

const LIM: Record<string, string> = {
  rester_assis:        "Rester assis longtemps",
  monter_escaliers:    "Monter les escaliers",
  porter_charges:      "Porter des charges",
  se_pencher:          "Se pencher en avant",
  fatigue_quotidienne: "Fatigue quotidienne",
  raideurs_reveil:     "Raideurs au réveil",
  stress_corporel:     "Stress corporel",
  manque_mobilite:     "Manque de mobilité",
  douleurs_travail:    "Douleurs liées au travail",
};

const REC: Record<string, string> = {
  mobilite:               "Mobilité",
  renforcement:           "Renforcement",
  respiration:            "Respiration",
  cardio:                 "Cardio",
  etirements:             "Étirements",
  reequilibrage_postural: "Rééquilibrage postural",
  performance:            "Performance",
  gestion_douleur:        "Gestion douleur",
};

const TESTS = [
  { key: "squat",          label: "Squat" },
  { key: "equilibre",      label: "Équilibre unipodal" },
  { key: "bras_au_dessus", label: "Bras au-dessus de la tête" },
  { key: "hip_hinge",      label: "Hip hinge" },
];

// ─── Data assembly ────────────────────────────────────────────────────────────

async function buildBilanData(id: string): Promise<{ data: BilanPdfData; slug: string } | { error: string } | null> {
  console.log(`[PDF] buildBilanData — assessmentId="${id}"`);

  const coachProfile = await getOsProfileWithRole("coach");
  if (!coachProfile) {
    console.log("[PDF] ❌ auth échouée — aucun profil coach trouvé");
    return null;
  }
  console.log(`[PDF] ✓ coach authentifié — coachId="${coachProfile.id}" roles=${JSON.stringify(coachProfile.roles)}`);

  const [assessment, images, settings] = await Promise.all([
    getAssessmentById(id),
    loadImages(),
    loadSettings(),
  ]);

  if (!assessment) {
    console.log(`[PDF] ❌ bilan introuvable — id="${id}"`);
    return { error: `Aucun bilan trouvé avec l'id "${id}".` };
  }
  console.log(`[PDF] ✓ bilan trouvé — clientId="${assessment.client_id}" coachId="${assessment.coach_id}"`);

  const isAdmin = coachProfile.roles.includes("admin");
  if (!isAdmin && assessment.coach_id !== coachProfile.id) {
    console.log(`[PDF] ❌ accès refusé — coachProfile.id="${coachProfile.id}" assessment.coach_id="${assessment.coach_id}"`);
    return { error: "Accès refusé — ce bilan appartient à un autre coach." };
  }

  const clientProfile = await getProfileById(assessment.client_id);
  const clientName = clientProfile?.display_name ?? "Client";

  const cabinetName = settings.companyName || "Cabinet";
  const baseUrl     = process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

  // Make logo URL absolute so Playwright can fetch it
  const rawLogo        = images?.logo && images.logo.length > 0 ? images.logo : null;
  const hasCustomLogo  = !!rawLogo;
  const logoSrc        = rawLogo ?? `${baseUrl}/logo.png`;

  const contactLine = [settings.phone, settings.email].filter(Boolean).join("  ·  ");
  const addressLine = [
    settings.address,
    [settings.postalCode, settings.city].filter(Boolean).join(" "),
  ].filter(Boolean).join("  ·  ");

  const dateStr = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  }).format(new Date(assessment.assessed_at));

  const axes = [
    { label: "Mobilité",     value: assessment.mobility_score     ?? 0, max: 20 },
    { label: "Stabilité",    value: assessment.stability_score    ?? 0, max: 20 },
    { label: "Force",        value: assessment.strength_score     ?? 0, max: 20 },
    { label: "Posture",      value: assessment.posture_score      ?? 0, max: 20 },
    { label: "Coordination", value: assessment.coordination_score ?? 0, max: 20 },
  ];
  const total = axes.reduce((s, a) => s + a.value, 0);

  const activeLim = Object.entries(assessment.daily_limitations ?? {})
    .filter(([, v]) => v).map(([k]) => LIM[k] ?? k);
  const activeRec = Object.entries(assessment.recommendations ?? {})
    .filter(([, v]) => v).map(([k]) => REC[k] ?? k);

  const tests = TESTS
    .map((t) => {
      const entry = (assessment.movement_tests as Record<string, AssessmentTestEntry> | null)?.[t.key];
      if (!entry) return null;
      return { label: t.label, score: entry.score, observation: entry.observation || undefined };
    })
    .filter(Boolean) as BilanPdfData["tests"];

  const data: BilanPdfData = {
    clientName, cabinetName, logoSrc, hasCustomLogo,
    contactLine, addressLine, dateStr,
    total, axes,
    activeLim, activeRec,
    topPriorities: activeRec.slice(0, 3),
    tests,
    energyScore:        assessment.energy_score,
    stressScore:        assessment.stress_score,
    sleepScore:         assessment.sleep_score,
    painScore:          assessment.pain_score,
    workType:           assessment.work_type,
    sportPracticed:     assessment.sport_practiced,
    sittingHoursPerDay: assessment.sitting_hours_per_day,
    painZones:          assessment.pain_zones,
    frequency:          assessment.frequency,
    motivation:         assessment.motivation,
    engagement:         assessment.engagement,
    mainGoal:           assessment.main_goal,
    concreteGoal:       assessment.concrete_goal,
    nextAction:         assessment.next_action,
    importantNotes:     assessment.important_notes,
    painEvolution:      assessment.pain_evolution,
    oldInjuries:        assessment.old_injuries,
    operations:         assessment.operations,
    coachName:          coachProfile.display_name,
    coachSignature:     assessment.coach_signature,
    clientSignature:    assessment.client_signature,
  };

  const slug = clientName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return { data, slug };
}

// ─── Playwright PDF ────────────────────────────────────────────────────────────

async function renderPdf(html: string): Promise<Buffer> {
  const { chromium } = await import("playwright-core");

  const executablePath = process.env.CHROME_EXECUTABLE_PATH
    || process.env.CHROMIUM_EXECUTABLE_PATH;

  const browser = await chromium.launch({
    executablePath: executablePath || undefined,
    channel: executablePath ? undefined : "chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ],
  });

  try {
    const context = await browser.newContext({
      baseURL: process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000",
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── GET handler ─────────────────────────────────────────────────────────────

type Params = Promise<{ id: string }>;

export async function GET(
  _req: Request,
  { params }: { params: Params }
) {
  const { id } = await params;
  const url = new URL(_req.url);
  const isPreview = url.searchParams.get("preview") === "1";
  const pdfMode = url.searchParams.get("mode") === "client" ? "client" : "coach";

  const result = await buildBilanData(id);

  // ── Auth / not found ──────────────────────────────────────────────────────
  if (!result) {
    // Auth échouée (pas de session) → 401
    const msg = "Session expirée. Reconnectez-vous.";
    if (isPreview) return htmlError(401, msg);
    return new Response(msg, { status: 401 });
  }

  if ("error" in result) {
    // Bilan introuvable ou accès refusé → 404
    if (isPreview) return htmlError(404, result.error);
    return new Response(result.error, { status: 404 });
  }

  const html = generateBilanHtml(result.data, pdfMode);
  console.log(`[PDF] ✓ HTML généré — slug="${result.slug}" preview=${isPreview}`);

  // ── Preview : renvoie l'HTML brut (iframe dans le viewer) ─────────────────
  if (isPreview) {
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  // ── PDF : Playwright render ───────────────────────────────────────────────
  console.log("[PDF] Lancement Playwright…");
  try {
    const pdfBuffer = await renderPdf(html);
    console.log(`[PDF] ✓ PDF généré — ${pdfBuffer.length} bytes`);

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="bilan-${result.slug}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[PDF] ❌ Playwright error:", err);
    return new Response("Erreur de génération PDF. Vérifiez que Chrome est installé.", { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function htmlError(status: number, message: string): Response {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>body{margin:0;background:#faf8f4;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}
.box{text-align:center;padding:40px}.icon{font-size:32px;margin-bottom:16px}.title{font-size:16px;font-weight:700;color:#1a1815;margin-bottom:8px}
.msg{font-size:13px;color:#8c7e6e;line-height:1.6;max-width:320px}</style>
</head><body><div class="box">
<div class="icon">⚠</div>
<div class="title">${status === 401 ? "Non connecté" : "Bilan introuvable"}</div>
<div class="msg">${message.replace(/</g, "&lt;")}</div>
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN" },
  });
}
