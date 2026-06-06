import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getOsProfileWithRole, getAssessmentById, getProfileById } from "@/lib/supabase/os-server";
import { loadSettings } from "@/lib/content/settings.server";
import { loadImages } from "@/lib/content/images.server";
import { generateBilanHtml, type BilanPdfData } from "@/lib/pdf/bilan-html";
import type { AssessmentTestEntry } from "@/lib/os/types";
import QRCode from "qrcode";

// body-map.png encodée en base64 pour injection directe dans le HTML (page.setContent ne résout pas les URL http://).
// Couche 1 : filesystem (dev local + Vercel si outputFileTracingIncludes configuré)
// Couche 2 : HTTP fetch depuis la même origine (fallback Vercel)
async function getBodyMapDataUrl(baseUrl: string): Promise<string> {
  const fsPath = join(process.cwd(), "public", "pdf-assets", "body-map.png");
  try {
    if (existsSync(fsPath)) {
      const buf = readFileSync(fsPath);
      console.log(`[PDF] ✓ body-map.png — filesystem — ${buf.length} bytes`);
      return `data:image/png;base64,${buf.toString("base64")}`;
    }
    console.warn(`[PDF] body-map.png absent du filesystem (${fsPath}) — essai HTTP`);
  } catch (e) {
    console.warn("[PDF] body-map.png filesystem error:", e);
  }

  try {
    const url = `${baseUrl}/pdf-assets/body-map.png`;
    console.log(`[PDF] Fetch body-map.png: ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const buf = Buffer.from(await res.arrayBuffer());
    console.log(`[PDF] ✓ body-map.png — HTTP — ${buf.length} bytes`);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.error("[PDF] ❌ body-map.png HTTP fetch échoué:", e);
  }

  console.error("[PDF] ❌ body-map.png introuvable — image anatomique ABSENTE du PDF");
  return "";
}

// ─── Route config ─────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

async function buildBilanData(id: string, baseUrl: string): Promise<{ data: BilanPdfData; slug: string } | { error: string } | null> {
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

  const appointmentUrl = coachProfile.calcom_url || null;
  const qrCodeDataUrl = appointmentUrl
    ? await QRCode.toDataURL(appointmentUrl, {
        margin: 1,
        width: 132,
        color: { dark: "#1E1812", light: "#F5EFE5" },
      }).catch(() => null)
    : null;

  const data: BilanPdfData = {
    clientName,
    sexe: (assessment.sexe as "femme" | "homme" | null | undefined) ?? null,
    age:  (assessment.age as number | null | undefined) ?? null,
    cabinetName, logoSrc, hasCustomLogo, bodyMapUrl: await getBodyMapDataUrl(baseUrl),
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
    mainLimitation: (assessment as Record<string, unknown>).main_limitation as string | null ?? null,
    coachName:     coachProfile.display_name,
    coachRole:     null,
    coachPhotoSrc: coachProfile.avatar_url,
    qrCodeDataUrl,
    bodyComposition: {
      weightKg:    assessment.weight_kg    ?? null,
      fatPct:      assessment.fat_pct      ?? null,
      musclePct:   assessment.muscle_pct   ?? null,
      waterPct:    assessment.water_pct    ?? null,
      boneMassKg:  assessment.bone_mass_kg ?? null,
      visceralFat: assessment.visceral_fat ?? null,
      bmrKcal:     assessment.bmr_kcal     ?? null,
      metabolicAge: assessment.metabolic_age ?? null,
      segArmRight: assessment.seg_arm_right_kg ?? null,
      segArmLeft:  assessment.seg_arm_left_kg  ?? null,
      segLegRight: assessment.seg_leg_right_kg ?? null,
      segLegLeft:  assessment.seg_leg_left_kg  ?? null,
      segTrunk:    assessment.seg_trunk_kg     ?? null,
    },
    zonePriorities: assessment.zone_priorities as Record<string, "forte" | "surveillance" | "ras"> | null,
  };

  const slug = clientName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return { data, slug };
}

// ─── Puppeteer PDF ────────────────────────────────────────────────────────────

// Chromium pack URL for serverless.
// @sparticuz/chromium-min downloads this binary at runtime into /tmp.
// GitHub releases only exist up to v133.x — v148 pack does NOT exist (→ 404).
// puppeteer-core v22 is compatible with Chromium 133.
// Override via CHROMIUM_PACK_URL env var if needed.
const DEFAULT_CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

async function renderPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");

  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  let executablePath: string;
  let launchArgs: string[];

  if (isServerless) {
    const chromiumMin = await import("@sparticuz/chromium-min");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bin = (chromiumMin.default ?? chromiumMin) as any as {
      args: string[];
      graphicsMode: boolean;
      executablePath: (url: string) => Promise<string>;
    };

    bin.graphicsMode = false;

    const packUrl = process.env.CHROMIUM_PACK_URL ?? DEFAULT_CHROMIUM_PACK_URL;
    console.log(`[PDF] Serverless Chromium — downloading from: ${packUrl}`);

    executablePath = await bin.executablePath(packUrl);
    launchArgs = [...bin.args, "--font-render-hinting=none"];

    console.log(`[PDF] executablePath: ${executablePath}`);
  } else {
    executablePath =
      process.env.CHROME_EXECUTABLE_PATH ||
      process.env.CHROMIUM_EXECUTABLE_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    launchArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--font-render-hinting=none",
    ];
  }

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: launchArgs,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
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
  const isPreview  = url.searchParams.get("preview") === "1";
  const pdfMode    = url.searchParams.get("mode") === "client" ? "client" : "coach";
  const baseUrl    = process.env.NEXT_PUBLIC_URL ?? `${url.protocol}//${url.host}`;
  console.log(`[PDF] baseUrl="${baseUrl}"`);

  let result: Awaited<ReturnType<typeof buildBilanData>>;
  try {
    result = await buildBilanData(id, baseUrl);
  } catch (err) {
    console.error("[PDF] ❌ buildBilanData exception:", err);
    const msg = "Erreur interne lors de la récupération du bilan.";
    if (isPreview) return htmlError(500, msg);
    return new Response(msg, { status: 500 });
  }

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
<div class="title">${status === 401 ? "Non connecté" : status === 500 ? "Erreur serveur" : "Bilan introuvable"}</div>
<div class="msg">${message.replace(/</g, "&lt;")}</div>
</div></body></html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Frame-Options": "SAMEORIGIN" },
  });
}
