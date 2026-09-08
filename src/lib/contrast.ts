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

// Picks whichever of near-black/near-white reads better on a given swatch,
// for overlaying a color's name directly on its own strip segment.
// Literal hex mirrors --paper-deep/--ink in globals.css (CSS custom
// properties aren't readable from plain hex math, so keep these in sync by hand).
export function readableTextColor(hex: string): string {
  const onDark = contrastRatio(hex, "#0d0a06");
  const onLight = contrastRatio(hex, "#f3ead6");
  return onLight >= onDark ? "#f3ead6" : "#0d0a06";
}

/**
 * For a swatch's own name label: prefer another color already in the same
 * palette over a generic black/white overlay, so a palette's card reads as
 * built from its own colors — always the best-contrasting sibling, with no
 * minimum-ratio (AA) requirement. Used as the label's pill/strip background
 * (with the swatch's own hex as the text color drawn on top of it), so the
 * name still visually matches its swatch. Falls back to readableTextColor
 * only when there are no siblings to pick from at all.
 */
export function pickPillColor(hex: string, siblingHexes: string[]): string {
  let best: { hex: string; ratio: number } | null = null;
  for (const sibling of siblingHexes) {
    if (sibling.toLowerCase() === hex.toLowerCase()) continue;
    const ratio = contrastRatio(hex, sibling);
    if (!best || ratio > best.ratio) {
      best = { hex: sibling, ratio };
    }
  }
  return best ? best.hex : readableTextColor(hex);
}
