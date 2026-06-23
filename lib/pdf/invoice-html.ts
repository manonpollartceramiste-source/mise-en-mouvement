import type { Invoice } from "@/lib/billing/types";
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

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function safeFmtEur(n: unknown): string {
  return fmtEur(n as number);
}

export function generateInvoiceHtml(
  invoice: Invoice,
  settings: SiteSettings,
  logoSrc: string,
): string {
  const lineItems = Array.isArray(invoice.line_items) ? invoice.line_items : [];

  const lineItemsHtml = lineItems
    .map(
      (item, i) => `
    <tr class="${i % 2 === 0 ? "row-even" : "row-odd"}">
      <td class="item-cell">
        <div class="item-name">${esc(item.name) || "—"}</div>
        ${item.description ? `<div class="item-desc">${esc(item.description)}</div>` : ""}
      </td>
      <td class="num-cell">${item.quantity ?? 0}</td>
      <td class="num-cell">${safeFmtEur(item.unit_price)}</td>
      <td class="num-cell">${(Number(item.tva_pct) > 0) ? item.tva_pct + "%" : "—"}</td>
      <td class="num-cell bold">${safeFmtEur(item.total_ht)}</td>
    </tr>`,
    )
    .join("");

  const hasDiscount = Number(invoice.discount_pct) > 0 || Number(invoice.discount_amount) > 0;
  const hasTva = Number(invoice.total_tva) > 0;
  const discountLabel = Number(invoice.discount_pct) > 0
    ? `−${invoice.discount_pct}%`
    : `−${safeFmtEur(invoice.discount_amount)}`;

  const isPaid = invoice.status === "payée";

  const addrParts = [settings.address || "2 place du marché", [settings.postal_code || "34560", settings.city || "Poussan"].filter(Boolean).join(" ")].filter(Boolean);
  const addrLine = addrParts.join(", ");
  const emailDisplay = settings.email || "contact@mise-en-mouvement.fr";
  const contactLine = [settings.phone, emailDisplay].filter(Boolean).join(" · ");

  const legalMentions = invoice.legal_mentions || settings.pdf_invoice_mentions || "";

  const logoHtml = logoSrc
    ? `<img src="${esc(logoSrc)}" alt="${esc(settings.company_name)}" class="hd-logo" />`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4 portrait;margin:0}
body{
  font-family:'Inter',-apple-system,sans-serif;
  font-size:13px;line-height:1.6;
  background:#F7F3EE;
  color:#2B2018;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
@media screen{
  body{background:#6B6B6B;display:flex;justify-content:center;padding:32px 16px;min-height:100vh}
  .page{box-shadow:0 6px 40px rgba(0,0,0,0.40)}
}

.page{
  width:210mm;min-height:297mm;
  display:flex;flex-direction:column;
  background:#F7F3EE;
}

/* ── HEADER BAND ── */
.hd{
  background:#1F1812;
  padding:8pt 12mm 7pt;
  display:flex;align-items:center;justify-content:space-between;
  flex-shrink:0;
}
.hd-brand{display:flex;align-items:center;gap:10pt}
.hd-logo{
  height:46px;width:auto;max-width:130px;
  object-fit:contain;object-position:left center;
  filter:brightness(0) invert(1) opacity(0.92);
  flex-shrink:0;
}
.hd-sep{width:0.5pt;height:24px;background:rgba(185,154,107,0.4);flex-shrink:0}
.hd-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:14.5px;font-weight:700;
  color:#F0E8DA;letter-spacing:-0.2px;
}
.hd-contact{font-size:10px;color:#7A6A58;margin-top:1pt}
.hd-right{text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3pt}
.hd-doc-type{
  font-size:10px;font-weight:700;
  color:#B99A6B;letter-spacing:3px;text-transform:uppercase;
}
.hd-doc-num{
  font-family:'Playfair Display',Georgia,serif;
  font-size:15px;font-weight:700;color:#E8DDD0;
}
.hd-doc-date{font-size:10px;color:#7A6A58}
.hd-paid-stamp{
  font-size:9px;font-weight:700;
  color:#2E7D52;border:1pt solid #2E7D52;
  border-radius:3pt;padding:1pt 5pt;
  letter-spacing:2px;text-transform:uppercase;
  display:inline-block;
  transform:rotate(-2deg);
}

.accent-bar{height:2pt;background:#B99A6B;flex-shrink:0}

.body{flex:1;padding:8mm 12mm 6mm;display:flex;flex-direction:column;gap:0}

/* ── SECTION LABEL ── */
.sec{display:flex;align-items:center;gap:7pt;margin-bottom:5pt}
.sec-lbl{
  font-size:10px;font-weight:700;
  color:#B99A6B;letter-spacing:2.5px;text-transform:uppercase;
  white-space:nowrap;
}
.sec-rule{flex:1;height:0.4pt;background:linear-gradient(90deg,#DED4C6,transparent)}

/* ── META (3 colonnes) ── */
.meta{display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;margin-bottom:7mm}
.meta-col{padding-right:8mm}
.meta-col:last-child{padding-right:0;text-align:right}
.meta-col-lbl{
  font-size:9px;font-weight:700;
  color:#B99A6B;letter-spacing:2px;text-transform:uppercase;
  margin-bottom:4pt;
}
.meta-company{
  font-family:'Playfair Display',Georgia,serif;
  font-size:14px;font-weight:600;color:#2B2018;
  margin-bottom:3pt;
}
.meta-line{font-size:11px;color:#6B5A48;line-height:1.7}

.client-name{
  font-family:'Playfair Display',Georgia,serif;
  font-size:18px;font-weight:700;color:#1F1812;
  margin-bottom:4pt;
}

.info-pair{margin-bottom:5pt}
.info-lbl{
  font-size:9px;font-weight:700;
  color:#B99A6B;letter-spacing:2px;text-transform:uppercase;
  display:block;margin-bottom:1pt;
}
.info-val{
  font-family:'Playfair Display',Georgia,serif;
  font-size:13px;font-weight:600;color:#2B2018;
}

/* ── PAIEMENT ── */
.payment-block{
  background:#fff;border:0.5pt solid #DED4C6;border-radius:8pt;
  padding:4mm 5mm;margin-bottom:6mm;
  display:flex;align-items:center;gap:5mm;
}
.payment-icon{font-size:18px}
.payment-lbl{font-size:9px;font-weight:700;color:#B99A6B;letter-spacing:2px;text-transform:uppercase;margin-bottom:2pt}
.payment-val{font-size:13px;font-weight:600;color:#2B2018}

/* ── TABLE PRESTATIONS ── */
.items-section{margin-bottom:6mm}
.items-table{width:100%;border-collapse:collapse;margin-top:5pt}
.items-table thead tr{border-bottom:1pt solid #DED4C6}
.items-table thead th{
  font-size:9px;font-weight:700;
  text-transform:uppercase;letter-spacing:1.5px;
  color:#B99A6B;padding:0 0 5pt;text-align:left;
}
.items-table thead th.num-head{text-align:right}
.items-table tbody tr{border-bottom:0.4pt solid #EDE8E0}
.items-table tbody tr:last-child{border-bottom:none}
.items-table tbody td{padding:4pt 0;vertical-align:top}
.row-even{background:transparent}
.row-odd{background:rgba(255,255,255,0.45)}
.item-cell{width:44%}
.item-name{font-size:12.5px;font-weight:600;color:#2B2018}
.item-desc{font-size:10.5px;color:#8A7A68;margin-top:2pt;line-height:1.5}
.num-cell{text-align:right;font-size:12px;color:#6B5A48}
.bold{font-weight:700;color:#2B2018}

/* ── TOTAUX ── */
.totaux-wrap{display:flex;justify-content:flex-end;margin-bottom:7mm}
.totaux-box{background:#EDE6DB;border:0.8pt solid #C8B89A;border-radius:10pt;padding:5mm 6mm;min-width:62mm}
.total-row{display:flex;justify-content:space-between;align-items:center;gap:16pt;margin-bottom:3pt}
.total-row.main-row{
  border-top:0.8pt solid #C8B89A;
  padding-top:6pt;margin-top:4pt;margin-bottom:0;
}
.total-lbl{font-size:11px;color:#7A6A58}
.total-val{font-size:11px;color:#2B2018;font-weight:500;white-space:nowrap}
.total-lbl.dim{color:#B8A898}
.total-val.dim{color:#B8A898}
.total-lbl.big{font-size:13px;color:#1F1812;font-weight:700}
.total-val.big{font-size:18px;color:#1F1812;font-weight:700}

/* ── BAS DE PAGE ── */
.bottom-blocks{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin-bottom:6mm}
.bottom-block{background:#fff;border:0.5pt solid #DED4C6;border-radius:8pt;padding:4mm 5mm}
.bb-lbl{
  font-size:9px;font-weight:700;
  color:#B99A6B;letter-spacing:2px;text-transform:uppercase;
  margin-bottom:4pt;
}
.bb-text{font-size:11px;color:#6B5A48;line-height:1.7}

/* ── FOOTER ── */
.doc-footer{
  margin-top:auto;padding:4pt 12mm;
  background:#1F1812;
  border-top:0.5pt solid #B99A6B;
  display:flex;justify-content:space-between;align-items:center;
  flex-shrink:0;
}
.footer-brand{font-family:'Playfair Display',Georgia,serif;font-size:12px;color:#D0C4B0}
.footer-info{font-size:9.5px;color:#7A6A58;text-align:right;line-height:1.6}
</style>
</head>
<body>
<div class="page">

  <!-- Header band -->
  <header class="hd">
    <div class="hd-brand">
      ${logoHtml ? `${logoHtml}<div class="hd-sep"></div>` : ""}
      <div>
        <div class="hd-name">${esc(settings.company_name)}</div>
        ${contactLine ? `<div class="hd-contact">${esc(contactLine)}</div>` : ""}
      </div>
    </div>
    <div class="hd-right">
      <div class="hd-doc-type">Facture</div>
      <div class="hd-doc-num">${esc(invoice.number)}</div>
      <div class="hd-doc-date">Émise le ${fmtDate(invoice.issued_at)}</div>
      ${isPaid ? `<div class="hd-paid-stamp">Payée</div>` : ""}
    </div>
  </header>
  <div class="accent-bar"></div>

  <!-- Body -->
  <div class="body">

    <!-- Meta : émetteur | client | infos -->
    <div class="meta">
      <div class="meta-col">
        <div class="meta-col-lbl">Émetteur</div>
        <div class="meta-company">${esc(settings.company_name)}</div>
        ${addrLine ? `<div class="meta-line">${esc(addrLine)}</div>` : ""}
        ${settings.phone ? `<div class="meta-line">${esc(settings.phone)}</div>` : ""}
        <div class="meta-line">${esc(emailDisplay)}</div>
        ${settings.siret ? `<div class="meta-line" style="margin-top:3pt;font-size:10px;color:#B99A6B">SIRET ${esc(settings.siret)}</div>` : ""}
      </div>
      <div class="meta-col">
        <div class="meta-col-lbl">Facturé à</div>
        ${invoice.client_name ? `<div class="client-name">${esc(invoice.client_name)}</div>` : "<div class=\"client-name\" style=\"color:#B99A6B\">Client</div>"}
        ${invoice.client_address ? `<div class="meta-line">${esc(invoice.client_address)}</div>` : ""}
        ${invoice.client_email ? `<div class="meta-line">${esc(invoice.client_email)}</div>` : ""}
        ${invoice.client_phone ? `<div class="meta-line">${esc(invoice.client_phone)}</div>` : ""}
      </div>
      <div class="meta-col">
        <div class="info-pair">
          <span class="info-lbl">Date d'émission</span>
          <span class="info-val">${fmtDate(invoice.issued_at)}</span>
        </div>
        <div class="info-pair">
          <span class="info-lbl">Échéance</span>
          <span class="info-val">${fmtDate(invoice.due_at)}</span>
        </div>
        ${invoice.quote_id ? `<div class="info-pair"><span class="info-lbl">Devis associé</span><span class="info-val" style="font-size:11px">${esc(invoice.quote_id.slice(0, 8))}…</span></div>` : ""}
      </div>
    </div>

    <!-- Mode de paiement -->
    ${invoice.payment_method ? `
    <div class="payment-block">
      <div class="payment-icon">💳</div>
      <div>
        <div class="payment-lbl">Mode de paiement</div>
        <div class="payment-val">${esc(invoice.payment_method)}</div>
      </div>
    </div>` : ""}

    <!-- Prestations -->
    <div class="items-section">
      <div class="sec">
        <span class="sec-lbl">Prestations</span>
        <div class="sec-rule"></div>
      </div>
      ${lineItems.length === 0 ? `<div style="font-size:11px;color:#B99A6B;padding:6pt 0;font-style:italic">Aucune prestation renseignée</div>` : `
      <table class="items-table">
        <thead>
          <tr>
            <th>Désignation</th>
            <th class="num-head">Qté</th>
            <th class="num-head">Prix unit. HT</th>
            <th class="num-head">TVA</th>
            <th class="num-head">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHtml}
        </tbody>
      </table>`}
    </div>

    <!-- Totaux -->
    <div class="totaux-wrap">
      <div class="totaux-box">
        <div class="total-row">
          <span class="total-lbl">Sous-total HT</span>
          <span class="total-val">${safeFmtEur(invoice.subtotal_ht)}</span>
        </div>
        ${hasDiscount ? `<div class="total-row">
          <span class="total-lbl dim">Remise</span>
          <span class="total-val dim">${discountLabel}</span>
        </div>` : ""}
        ${hasTva ? `<div class="total-row">
          <span class="total-lbl">TVA</span>
          <span class="total-val">${safeFmtEur(invoice.total_tva)}</span>
        </div>` : ""}
        <div class="total-row main-row">
          <span class="total-lbl big">Total TTC</span>
          <span class="total-val big">${safeFmtEur(invoice.total_ttc)}</span>
        </div>
      </div>
    </div>

    <!-- Mentions légales + Notes -->
    ${(() => {
      const defaultMentions = hasTva ? "En cas de retard de paiement, des pénalités de retard sont applicables selon la réglementation en vigueur." : "TVA non applicable, art. 293 B du CGI. En cas de retard de paiement, des pénalités de retard sont applicables selon la réglementation en vigueur.";
      const mentionsText = legalMentions || defaultMentions;
      return `<div class="bottom-blocks">
      <div class="bottom-block">
        <div class="bb-lbl">Mentions légales</div>
        <div class="bb-text">${esc(mentionsText)}</div>
      </div>
      ${invoice.notes ? `<div class="bottom-block">
        <div class="bb-lbl">Notes</div>
        <div class="bb-text">${esc(invoice.notes)}</div>
      </div>` : ""}
    </div>`;
    })()}

  </div><!-- /body -->

  <!-- Footer -->
  <footer class="doc-footer">
    <div class="footer-brand">${esc(settings.company_name)}</div>
    <div class="footer-info">
      ${settings.pdf_footer_text ? `<div>${esc(settings.pdf_footer_text)}</div>` : ""}
      ${settings.siret ? `<div>SIRET ${esc(settings.siret)}</div>` : ""}
      ${settings.website ? `<div>${esc(settings.website)}</div>` : ""}
    </div>
  </footer>

</div>
</body>
</html>`;
}
