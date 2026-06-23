/**
 * Shared Puppeteer/Chromium PDF renderer — used by all /api/pdf/* routes.
 * Kept separate to avoid duplicating 40 lines of serverless boilerplate.
 */

const DEFAULT_CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar";

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  const isServerless =
    !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;

  let executablePath: string;
  let launchArgs: string[];

  if (isServerless) {
    const chromiumMin = await import("@sparticuz/chromium-min");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bin = (chromiumMin.default ?? chromiumMin) as any;
    bin.graphicsMode = false;
    const packUrl = process.env.CHROMIUM_PACK_URL ?? DEFAULT_CHROMIUM_PACK_URL;
    executablePath = await bin.executablePath(packUrl);
    launchArgs = [...bin.args, "--font-render-hinting=none"];
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

export function pdfErrorHtml(status: number, message: string): Response {
  const title =
    status === 401
      ? "Non connecté"
      : status === 403
        ? "Accès refusé"
        : status === 404
          ? "Document introuvable"
          : "Erreur serveur";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<style>body{margin:0;background:#faf8f4;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}
.box{text-align:center;padding:40px}.title{font-size:16px;font-weight:700;color:#1a1815;margin-bottom:8px}
.msg{font-size:13px;color:#8c7e6e;max-width:320px;margin:0 auto}</style>
</head><body><div class="box">
<div class="title">${title}</div>
<div class="msg">${message.replace(/</g, "&lt;")}</div>
</div></body></html>`;
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

export function slugify(str: string): string {
  return (str || "document")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
