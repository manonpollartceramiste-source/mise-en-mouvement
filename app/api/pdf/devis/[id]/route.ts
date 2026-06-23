import { getOsProfileWithRole } from "@/lib/supabase/os-server";
import { getQuoteById, getSiteSettings } from "@/lib/billing/server";
import { loadImages } from "@/lib/content/images.server";
import { generateQuoteHtml } from "@/lib/pdf/quote-html";
import { renderHtmlToPdf, pdfErrorHtml, slugify } from "@/lib/pdf/render";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const url = new URL(_req.url);
  const isPreview = url.searchParams.get("preview") === "1";

  const profile = await getOsProfileWithRole("coach");
  if (!profile) {
    return pdfErrorHtml(401, "Session expirée. Reconnectez-vous.");
  }

  const [quote, settings, images] = await Promise.all([
    getQuoteById(id),
    getSiteSettings(),
    loadImages(),
  ]);

  if (!quote) {
    return pdfErrorHtml(404, `Devis introuvable (id : ${id}).`);
  }

  const isAdmin = profile.roles.includes("admin");
  if (!isAdmin && quote.coach_id !== profile.id) {
    return pdfErrorHtml(403, "Accès refusé — ce devis appartient à un autre coach.");
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL ?? `${url.protocol}//${url.host}`;
  const logoSrc = settings.logo_url || (images?.logo ?? "") || `${baseUrl}/logo.png`;

  const html = generateQuoteHtml(quote, settings, logoSrc);

  if (isPreview) {
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  try {
    const pdfBuffer = await renderHtmlToPdf(html);
    const filename = `devis-${quote.number}-${slugify(quote.client_name)}.pdf`;
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[PDF Devis] Erreur Puppeteer:", err);
    return new Response("Erreur de génération PDF.", { status: 500 });
  }
}
