import crypto from "node:crypto";
import { db } from "./db";
import { MAX_PALETTE_COLOURS } from "./constants";

export { MAX_PALETTE_COLOURS };

// Full 6-digit #RRGGBB only — see palettes/new/actions.ts for why shorthand
// is rejected rather than expanded.
export const HEX_COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * Palettes have no user-facing name — this is an internal-only label, never
 * shown, that exists purely because the DB column is NOT NULL and the
 * export route needs *some* string to fall back on. Shared so every palette,
 * however it was created, follows the same convention.
 */
export function generatePaletteName(): string {
  return `palette-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Creates a palette from a flat list of hex colours — each colour's `name`
 * is just its own hex, `role` is always "any" (there's no UI here to assign
 * roles), ordered by array position — links the given tag ids into
 * `palette_tags`, and records `source_screen_id` so the palette detail view
 * can link back to the screen it was extracted from. Used by the "save
 * colours as palette" option on the screen add/edit forms, as opposed to
 * `createPalette` (`palettes/new/actions.ts`), which handles the manually
 * authored named/rolled palette form.
 */
export function createPaletteFromHexes(
  hexes: string[],
  tagIds: number[],
  sourceScreenId: number | null,
): number {
  const name = generatePaletteName();
  const result = db
    .prepare("INSERT INTO palettes (name, source_screen_id) VALUES (?, ?)")
    .run(name, sourceScreenId);
  const paletteId = Number(result.lastInsertRowid);

  const insertColor = db.prepare(
    "INSERT INTO palette_colors (palette_id, name, hex, role, position) VALUES (?, ?, ?, 'any', ?)",
  );
  hexes.forEach((hex, position) => insertColor.run(paletteId, hex, hex, position));

  const linkTag = db.prepare(
    "INSERT OR IGNORE INTO palette_tags (palette_id, tag_id) VALUES (?, ?)",
  );
  for (const tagId of tagIds) linkTag.run(paletteId, tagId);

  return paletteId;
}

export type SavePaletteRequest = {
  requested: boolean;
  hexes: string[];
  error?: string;
};

/**
 * Reads and validates the "save colours as palette" fields off a screen
 * add/edit form submission. `save_palette` not checked means "don't create
 * one" regardless of how many colours rode along; checked means at least 2
 * valid `#RRGGBB` colours are required — the client already enforces this
 * (disabled submit button) but that can't be trusted alone.
 */
export function parseSavePaletteRequest(formData: FormData): SavePaletteRequest {
  const requested = formData.get("save_palette") === "on";
  if (!requested) return { requested: false, hexes: [] };

  const hexes = formData
    .getAll("palette_hex")
    .map((v) => String(v).trim())
    .filter(Boolean);

  for (const hex of hexes) {
    if (!HEX_COLOUR_RE.test(hex)) {
      return { requested: true, hexes: [], error: `Invalid palette colour "${hex}" — expected #RRGGBB.` };
    }
  }

  if (hexes.length < 2) {
    return {
      requested: true,
      hexes: [],
      error: 'A palette needs at least 2 colours — add another or uncheck "Save colours as palette".',
    };
  }
  if (hexes.length > MAX_PALETTE_COLOURS) {
    return {
      requested: true,
      hexes: [],
      error: `A palette can have at most ${MAX_PALETTE_COLOURS} colours.`,
    };
  }

  return { requested: true, hexes };
}
