import type { Quote } from "@/lib/billing/types";
import type { SiteSettings } from "@/lib/billing/types";
import { fmtEur } from "@/lib/billing/types";

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateQuoteHtml(
  quote: Quote,
  settings: SiteSettings,
  logoSrc: string,
): string {
  const lineItemsHtml = (quote.line_items ?? [])
    .map(
      (item) => `
    <tr>
      <td class="item-cell">
        <div class="item-name">${esc(item.name)}</div>
        ${item.description ? `<div class="item-desc">${esc(item.description)}</div>` : ""}
      </td>
      <td class="num-cell">${item.quantity}</td>
      <td class="num-cell">${fmtEur(item.unit_price)}</td>
      <td class="num-cell">${item.tva_pct > 0 ? item.tva_pct + "%" : "—"}</td>
      <td class="num-cell bold">${fmtEur(item.total_ht)}</td>
    </tr>`,
    )
    .join("");

  const hasDiscount = quote.discount_pct > 0 || quote.discount_amount > 0;
  const discountLine = hasDiscount
    ? `<div class="total-row">
        <span class="total-label light">Remise</span>
        <span class="total-value light">
          ${quote.discount_pct > 0 ? `−${quote.discount_pct}%` : `−${fmtEur(quote.discount_amount)}`}
        </span>
       </div>`
    : "";

  const hasTva = quote.total_tva > 0;

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="Logo" class="logo" />`
    : `<div class="logo-text">${esc(settings.company_name)}</div>`;

  const addrLine = [settings.address, [settings.postal_code, settings.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" · ");
  const contactLine = [settings.phone, settings.email].filter(Boolean).join(" · ");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Inter:wght@300;400;500;600&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --sand-50: #f7f2e8;
    --sand-100: #ede3d0;
    --sand-200: #d9cdb6;
    --taupe-300: #beb09c;
    --taupe-400: #a89a89;
    --taupe-500: #8c7e6e;
    --taupe-600: #6e6353;
    --taupe-700: #4f463b;
    --taupe-800: #3d352c;
    --ink-900: #1a1815;
  }

  body {
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 13px;
    color: var(--ink-900);
    background: #fff;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ── Page layout ── */
  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 16mm 14mm;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 8mm;
    border-bottom: 1.5px solid var(--sand-200);
    margin-bottom: 10mm;
  }

  .logo { height: 44px; width: auto; object-fit: contain; }
  .logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: var(--ink-900);
    letter-spacing: -0.02em;
  }

  .doc-label {
    text-align: right;
  }
  .doc-label .doc-type {
    font-family: 'Playfair Display', serif;
    font-size: 28px;
    color: var(--ink-900);
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .doc-label .doc-number {
    font-size: 11px;
    color: var(--taupe-500);
    font-weight: 500;
    margin-top: 4px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  /* ── Meta row (émetteur / destinataire / infos) ── */
  .meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8mm;
    margin-bottom: 10mm;
  }

  .meta-block .meta-title {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--taupe-400);
    margin-bottom: 5px;
  }
  .meta-block .meta-company {
    font-family: 'Playfair Display', serif;
    font-size: 15px;
    color: var(--ink-900);
    margin-bottom: 3px;
  }
  .meta-block .meta-line {
    font-size: 11.5px;
    color: var(--taupe-600);
    line-height: 1.65;
  }

  .info-pair { margin-bottom: 3px; }
  .info-label {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--taupe-400);
    display: block;
    margin-bottom: 1px;
  }
  .info-value {
    font-size: 11.5px;
    color: var(--ink-900);
    font-weight: 500;
  }

  /* ── Title block ── */
  .title-block {
    background: var(--sand-50);
    border-radius: 10px;
    padding: 5mm 6mm;
    margin-bottom: 8mm;
  }
  .title-block .quote-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: var(--ink-900);
  }
  .title-block .quote-desc {
    font-size: 11.5px;
    color: var(--taupe-600);
    margin-top: 4px;
  }

  /* ── Table ── */
  .items-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 6mm;
  }

  .items-table thead tr {
    border-bottom: 1.5px solid var(--sand-200);
  }

  .items-table thead th {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--taupe-500);
    padding: 0 0 5px;
    text-align: left;
  }
  .items-table thead th.num-head { text-align: right; }

  .items-table tbody tr {
    border-bottom: 1px solid var(--sand-100);
  }
  .items-table tbody td {
    padding: 4.5mm 0;
    vertical-align: top;
  }

  .item-cell { width: 45%; }
  .item-name { font-weight: 500; color: var(--ink-900); }
  .item-desc { font-size: 11px; color: var(--taupe-500); margin-top: 2px; }
  .num-cell { text-align: right; color: var(--taupe-600); }
  .bold { font-weight: 600; color: var(--ink-900); }

  /* ── Totals ── */
  .totals-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 8mm;
  }
  .totals-box {
    background: var(--ink-900);
    border-radius: 12px;
    padding: 5mm 6mm;
    min-width: 55mm;
  }
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 3px;
  }
  .total-row.main-row {
    border-top: 1px solid rgba(255,255,255,0.15);
    padding-top: 5px;
    margin-top: 4px;
    margin-bottom: 0;
  }
  .total-label {
    font-size: 11.5px;
    color: rgba(255,255,255,0.65);
  }
  .total-value {
    font-size: 11.5px;
    color: #fff;
    font-weight: 500;
    white-space: nowrap;
  }
  .total-label.light { color: rgba(255,255,255,0.5); }
  .total-value.light { color: rgba(255,255,255,0.5); }
  .total-label.big { font-size: 13px; color: #fff; font-weight: 600; }
  .total-value.big { font-size: 16px; color: #fff; font-weight: 700; }

  /* ── Footer blocks ── */
  .footer-blocks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6mm;
    margin-bottom: 8mm;
  }
  .footer-block {
    background: var(--sand-50);
    border-radius: 10px;
    padding: 4mm 5mm;
  }
  .footer-block .fb-title {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--taupe-400);
    margin-bottom: 5px;
  }
  .footer-block .fb-text {
    font-size: 11.5px;
    color: var(--taupe-600);
    line-height: 1.65;
  }

  /* ── Doc footer ── */
  .doc-footer {
    margin-top: auto;
    padding-top: 5mm;
    border-top: 1px solid var(--sand-200);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4mm;
  }
  .doc-footer .footer-brand {
    font-family: 'Playfair Display', serif;
    font-size: 13px;
    color: var(--taupe-700);
  }
  .doc-footer .footer-contact {
    font-size: 10.5px;
    color: var(--taupe-500);
    text-align: right;
  }
  ${settings.siret ? `.doc-footer .footer-siret {
    font-size: 10px;
    color: var(--taupe-400);
  }` : ""}
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <header class="header">
    ${logoHtml}
    <div class="doc-label">
      <div class="doc-type">Devis</div>
      <div class="doc-number">${esc(quote.number)}</div>
    </div>
  </header>

  <!-- Meta -->
  <div class="meta-row">
    <div class="meta-block">
      <div class="meta-title">Émetteur</div>
      <div class="meta-company">${esc(settings.company_name)}</div>
      ${addrLine ? `<div class="meta-line">${esc(addrLine)}</div>` : ""}
      ${contactLine ? `<div class="meta-line">${esc(contactLine)}</div>` : ""}
      ${settings.siret ? `<div class="meta-line">SIRET ${esc(settings.siret)}</div>` : ""}
    </div>
    <div class="meta-block">
      <div class="meta-title">Client</div>
      ${quote.client_name ? `<div class="meta-company">${esc(quote.client_name)}</div>` : ""}
      ${quote.client_address ? `<div class="meta-line">${esc(quote.client_address)}</div>` : ""}
      ${quote.client_email ? `<div class="meta-line">${esc(quote.client_email)}</div>` : ""}
      ${quote.client_phone ? `<div class="meta-line">${esc(quote.client_phone)}</div>` : ""}
    </div>
    <div class="meta-block">
      <div class="info-pair">
        <span class="info-label">Date d'émission</span>
        <span class="info-value">${fmtDate(quote.issued_at)}</span>
      </div>
      <div class="info-pair" style="margin-top:6px">
        <span class="info-label">Valable jusqu'au</span>
        <span class="info-value">${fmtDate(quote.expires_at)}</span>
      </div>
    </div>
  </div>

  <!-- Title block -->
  ${(quote.title || quote.description) ? `
  <div class="title-block">
    ${quote.title ? `<div class="quote-title">${esc(quote.title)}</div>` : ""}
    ${quote.description ? `<div class="quote-desc">${esc(quote.description)}</div>` : ""}
  </div>` : ""}

  <!-- Items table -->
  <table class="items-table">
    <thead>
      <tr>
        <th>Prestation</th>
        <th class="num-head">Qté</th>
        <th class="num-head">Prix unit. HT</th>
        <th class="num-head">TVA</th>
        <th class="num-head">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHtml}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals-wrapper">
    <div class="totals-box">
      <div class="total-row">
        <span class="total-label">Sous-total HT</span>
        <span class="total-value">${fmtEur(quote.subtotal_ht)}</span>
      </div>
      ${hasDiscount ? discountLine : ""}
      ${hasTva ? `<div class="total-row">
        <span class="total-label">TVA</span>
        <span class="total-value">${fmtEur(quote.total_tva)}</span>
      </div>` : ""}
      <div class="total-row main-row">
        <span class="total-label big">Total TTC</span>
        <span class="total-value big">${fmtEur(quote.total_ttc)}</span>
      </div>
    </div>
  </div>

  <!-- Footer blocks -->
  ${(quote.conditions || quote.notes || settings.pdf_quote_conditions) ? `
  <div class="footer-blocks">
    ${(quote.conditions || settings.pdf_quote_conditions) ? `
    <div class="footer-block">
      <div class="fb-title">Conditions</div>
      <div class="fb-text">${esc(quote.conditions || settings.pdf_quote_conditions)}</div>
    </div>` : ""}
    ${quote.notes ? `
    <div class="footer-block">
      <div class="fb-title">Notes</div>
      <div class="fb-text">${esc(quote.notes)}</div>
    </div>` : ""}
  </div>` : ""}

  <!-- Doc footer -->
  <footer class="doc-footer">
    <div class="footer-brand">${esc(settings.company_name)}</div>
    <div>
      ${settings.pdf_footer_text ? `<div class="footer-contact">${esc(settings.pdf_footer_text)}</div>` : ""}
      ${settings.siret ? `<div class="footer-siret">SIRET ${esc(settings.siret)}</div>` : ""}
    </div>
  </footer>

</div>
</body>
</html>`;
}
