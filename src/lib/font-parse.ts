import * as fontkit from "fontkit";

/**
 * Named weight classes per the OS/2 usWeightClass spec. Used both for an
 * exact match and, if the font declares an unusual value, as the nearest
 * reference point rather than leaving the label blank.
 */
const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "Extra Light",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semi Bold",
  700: "Bold",
  800: "Extra Bold",
  900: "Black",
};

function nearestWeightName(weightClass: number): string {
  const keys = Object.keys(WEIGHT_NAMES).map(Number);
  const closest = keys.reduce((prev, curr) =>
    Math.abs(curr - weightClass) < Math.abs(prev - weightClass) ? curr : prev,
  );
  return WEIGHT_NAMES[closest];
}

/**
 * Font formats browsers can actually render via @font-face. `.ttc`
 * (collections) parse fine here but never render in a browser, which would
 * silently defeat the whole point of a saved font entry — so it's excluded
 * on purpose, not an oversight.
 */
export const ACCEPTED_FONT_EXTENSIONS = [".ttf", ".otf", ".woff", ".woff2"] as const;

// Mirrors Node's `path.extname` exactly (including its one quirk: a
// filename with a dot only as its very first character, e.g. `.ttf`, has
// no extension) rather than importing `node:path` — this module is
// deliberately dependency-free so it stays safely shared between the
// server action and the browser-side picker. `saveUpload` (`src/lib/
// uploads.ts`) uses the real `path.extname` to name the file on disk; if
// this disagreed with it, a filename this function calls "accepted" could
// still get written without the extension that implies.
function extname(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i <= 0 ? "" : filename.slice(i).toLowerCase();
}

export function isAcceptedFontFilename(filename: string): boolean {
  return (ACCEPTED_FONT_EXTENSIONS as readonly string[]).includes(extname(filename));
}

export function isFontCollectionFilename(filename: string): boolean {
  return extname(filename) === ".ttc";
}

/**
 * Parses an uploaded font file buffer and pulls the family name and a
 * human-readable weight label straight from the file — the user never
 * types either. Throws on a corrupt/unsupported file; the caller (the
 * "New Font" server action, or the client-side family picker) is
 * responsible for catching that and surfacing a real validation error
 * instead of trusting guessed data.
 *
 * Runs both server-side (a real Node `Buffer`) and client-side (a
 * `Uint8Array` cast to `Buffer` for the type signature only — fontkit's
 * browser build only ever touches `.buffer`/`.byteOffset`/`.byteLength`/
 * `.length`/`.slice()`, which every typed array already has) — this is the
 * one parser both the add-form's picker preview and the server action rely
 * on, so they can never drift apart.
 */
export async function parseFontFile(
  buffer: Buffer,
): Promise<{ familyName: string; weightLabel: string }> {
  const parsed = fontkit.create(buffer);

  // Collections (.ttc) are rejected before they ever reach this function
  // (client-side filter, server-side extension check) since browsers can't
  // render them — if one slips through anyway, fail loudly rather than
  // silently picking its first bundled font.
  if ("fonts" in parsed) {
    throw new Error("Font collections (.ttc) aren't supported — extract the individual fonts first.");
  }

  const font = parsed;

  if (!font) {
    throw new Error("No font could be read from this file.");
  }

  const familyName =
    font.familyName?.trim() || font.postscriptName?.trim() || "";

  if (!familyName) {
    throw new Error("Could not determine a family name for this font.");
  }

  const wght = font.variationAxes?.wght;
  let weightLabel: string;

  if (wght) {
    weightLabel = `Variable, ${wght.min}–${wght.max}`;
  } else {
    const weightClass = font["OS/2"]?.usWeightClass;
    if (typeof weightClass === "number" && weightClass > 0) {
      const name = WEIGHT_NAMES[weightClass] ?? nearestWeightName(weightClass);
      weightLabel = `${weightClass} · ${name}`;
    } else {
      weightLabel = "Regular";
    }
  }

  // A subfamily like "Italic" or "Bold Italic" carries a style the weight
  // number alone doesn't — fold it in so two variant files (e.g. Regular +
  // Regular Italic) don't parse to the exact same label.
  const subfamily = font.subfamilyName?.trim();
  if (subfamily && /italic|oblique/i.test(subfamily) && !/italic|oblique/i.test(weightLabel)) {
    weightLabel = `${weightLabel} Italic`;
  }

  return { familyName, weightLabel };
}
