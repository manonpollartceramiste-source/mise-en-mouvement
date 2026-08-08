import { describe, it, expect } from "vitest";
import { computeKtw, KTW_SLIGHT_CM, KTW_IMPORTANT_CM } from "../ktw.js";

// ─── Valeurs manquantes ───────────────────────────────────────────────────────

describe("computeKtw — valeurs manquantes", () => {
  it("null / null → null", () => {
    expect(computeKtw(null, null)).toBeNull();
  });
  it("gauche seule → null", () => {
    expect(computeKtw(10, null)).toBeNull();
  });
  it("droite seule → null", () => {
    expect(computeKtw(null, 8)).toBeNull();
  });
});

// ─── Symétrique (diff < 2 cm) ─────────────────────────────────────────────────

describe("computeKtw — symétrique", () => {
  it("valeurs égales → diff=0, symétrique", () => {
    const r = computeKtw(10, 10);
    expect(r).not.toBeNull();
    expect(r!.diff).toBe(0);
    expect(r!.interpretation).toBe("symetrique");
  });

  it("diff < 2 cm → symétrique", () => {
    const r = computeKtw(10, 8.5);  // diff = 1.5
    expect(r!.interpretation).toBe("symetrique");
    expect(r!.diff).toBeCloseTo(1.5);
  });

  it("zéro des deux côtés → symétrique", () => {
    const r = computeKtw(0, 0);
    expect(r!.diff).toBe(0);
    expect(r!.interpretation).toBe("symetrique");
  });

  it(`juste en dessous du seuil (${KTW_SLIGHT_CM} cm) → symétrique`, () => {
    const r = computeKtw(10, 10 - KTW_SLIGHT_CM + 0.1);  // diff = 1.9
    expect(r!.interpretation).toBe("symetrique");
  });
});

// ─── Légère asymétrie (2 ≤ diff < 4 cm) ─────────────────────────────────────

describe("computeKtw — légère asymétrie", () => {
  it("diff = 2 cm exact → légère asymétrie", () => {
    const r = computeKtw(12, 10);
    expect(r!.diff).toBeCloseTo(2);
    expect(r!.interpretation).toBe("asymetrie_legere");
  });

  it("gauche > droite → diff correcte", () => {
    const r = computeKtw(11, 8.5);  // diff = 2.5
    expect(r!.diff).toBeCloseTo(2.5);
    expect(r!.interpretation).toBe("asymetrie_legere");
  });

  it("droite > gauche → diff absolue correcte", () => {
    const r = computeKtw(8, 11);  // diff = 3
    expect(r!.diff).toBeCloseTo(3);
    expect(r!.interpretation).toBe("asymetrie_legere");
  });

  it("décimales — diff = 2.2 cm → légère asymétrie", () => {
    const r = computeKtw(10.5, 8.3);
    expect(r!.diff).toBeCloseTo(2.2);
    expect(r!.interpretation).toBe("asymetrie_legere");
  });

  it(`juste en dessous du seuil supérieur (${KTW_IMPORTANT_CM} cm) → légère asymétrie`, () => {
    const r = computeKtw(13.9, 10);  // diff = 3.9
    expect(r!.interpretation).toBe("asymetrie_legere");
  });
});

// ─── Asymétrie importante (diff ≥ 4 cm) ─────────────────────────────────────

describe("computeKtw — asymétrie importante", () => {
  it(`diff = ${KTW_IMPORTANT_CM} cm exact → asymétrie importante`, () => {
    const r = computeKtw(14, 10);
    expect(r!.diff).toBeCloseTo(4);
    expect(r!.interpretation).toBe("asymetrie_importante");
  });

  it("diff > 4 cm → asymétrie importante", () => {
    const r = computeKtw(15, 8);  // diff = 7
    expect(r!.diff).toBeCloseTo(7);
    expect(r!.interpretation).toBe("asymetrie_importante");
  });

  it("zéro d'un côté, 5 de l'autre → asymétrie importante", () => {
    const r = computeKtw(0, 5);
    expect(r!.diff).toBeCloseTo(5);
    expect(r!.interpretation).toBe("asymetrie_importante");
  });
});

// ─── Propriété de symétrie : |a-b| = |b-a| ───────────────────────────────────

describe("computeKtw — symétrie de la différence absolue", () => {
  it("computeKtw(a,b).diff === computeKtw(b,a).diff", () => {
    const r1 = computeKtw(12, 9);
    const r2 = computeKtw(9, 12);
    expect(r1!.diff).toBeCloseTo(r2!.diff);
    expect(r1!.interpretation).toBe(r2!.interpretation);
  });
});
