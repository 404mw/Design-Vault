// WCAG 2 contrast math, implemented directly per the task spec rather than
// pulled from a library — this is the whole function, nothing hidden.

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return [r, g, b];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const [lighter, darker] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (lighter + 0.05) / (darker + 0.05);
}

export type AaResult = "Pass" | "Large only" | "Fail";
export type AaaResult = "Pass" | "Fail";

// AA: 4.5:1 for normal text, 3:1 for large text. AAA: 7:1.
export function aaResult(ratio: number): AaResult {
  if (ratio >= 4.5) return "Pass";
  if (ratio >= 3) return "Large only";
  return "Fail";
}

export function aaaResult(ratio: number): AaaResult {
  return ratio >= 7 ? "Pass" : "Fail";
}
