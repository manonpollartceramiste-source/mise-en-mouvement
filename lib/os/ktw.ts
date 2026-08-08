// ─── Knee to Wall — calcul et interprétation ─────────────────────────────────
//
// Seuils validés le 2026-08-08 :
//   diff < 2 cm     → Symétrique
//   2 ≤ diff < 4 cm → Légère asymétrie
//   diff ≥ 4 cm     → Asymétrie importante
//
// Référence : Konor MM et al. (2012), J Orthop Sports Phys Ther.
//
// Pour modifier les seuils, changer uniquement ces deux constantes.
export const KTW_SLIGHT_CM    = 2;   // diff < KTW_SLIGHT_CM    → symétrique
export const KTW_IMPORTANT_CM = 4;   // diff ≥ KTW_IMPORTANT_CM → asymétrie importante

export type KtwInterpretation = "symetrique" | "asymetrie_legere" | "asymetrie_importante";

export type KtwResult = {
  diff: number;
  interpretation: KtwInterpretation;
};

export function computeKtw(
  leftCm: number | null,
  rightCm: number | null,
): KtwResult | null {
  if (leftCm === null || rightCm === null) return null;
  const diff = Math.abs(leftCm - rightCm);
  let interpretation: KtwInterpretation;
  if (diff < KTW_SLIGHT_CM) interpretation = "symetrique";
  else if (diff < KTW_IMPORTANT_CM) interpretation = "asymetrie_legere";
  else interpretation = "asymetrie_importante";
  return { diff, interpretation };
}

export const KTW_LABELS: Record<KtwInterpretation, string> = {
  symetrique:           "Symétrique",
  asymetrie_legere:     "Légère asymétrie",
  asymetrie_importante: "Asymétrie importante",
};

// Tailwind text color classes
export const KTW_TEXT_COLORS: Record<KtwInterpretation, string> = {
  symetrique:           "text-emerald-600",
  asymetrie_legere:     "text-amber-600",
  asymetrie_importante: "text-red-600",
};

// Hex colors for PDF
export const KTW_PDF_COLORS: Record<KtwInterpretation, { bar: string; bg: string; border: string; text: string }> = {
  symetrique:           { bar: "#2E7D52", bg: "#F2FBF6", border: "#A4DEBA", text: "#1A5C38" },
  asymetrie_legere:     { bar: "#C47040", bg: "#FDF9F2", border: "#E8CFA0", text: "#7A5020" },
  asymetrie_importante: { bar: "#C44444", bg: "#FEF4F4", border: "#F0C0C0", text: "#8A2828" },
};
