"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { COLOR_ROLES, type ColorRole } from "@/lib/constants";
import { HEX_COLOUR_RE as HEX_RE, generatePaletteName, MAX_PALETTE_COLOURS } from "@/lib/palettes";

type DraftColor = { name: string; hex: string; role: ColorRole };

export async function createPalette(formData: FormData): Promise<void> {
  // Palettes have no user-facing name (removed from the form and every
  // display) — see generatePaletteName for why one still exists internally.
  const name = generatePaletteName();

  const names = formData.getAll("color_name").map((v) => String(v));
  const hexes = formData.getAll("color_hex").map((v) => String(v));
  const roles = formData.getAll("color_role").map((v) => String(v));

  const rowCount = Math.max(names.length, hexes.length, roles.length);
  const complete: DraftColor[] = [];

  for (let i = 0; i < rowCount; i++) {
    const rowName = (names[i] ?? "").trim();
    const rowHex = (hexes[i] ?? "").trim();
    const rowRole = (roles[i] ?? "").trim();

    // A row where every field is blank is just an untouched extra row —
    // skip it rather than fail the whole submission on it.
    if (!rowName && !rowHex && !rowRole) continue;

    if (!rowName || !rowHex || !rowRole) {
      throw new Error(`Color row ${i + 1} is incomplete — name, hex, and role are all required.`);
    }
    if (!HEX_RE.test(rowHex)) {
      throw new Error(`Color row ${i + 1} has an invalid hex value "${rowHex}" — expected #RRGGBB.`);
    }
    if (!(COLOR_ROLES as readonly string[]).includes(rowRole)) {
      throw new Error(`Color row ${i + 1} has an unknown role "${rowRole}".`);
    }

    complete.push({ name: rowName, hex: rowHex, role: rowRole as ColorRole });
  }

  if (complete.length < 2) {
    throw new Error("A palette needs at least 2 complete colors (name, hex, and role each).");
  }
  if (complete.length > MAX_PALETTE_COLOURS) {
    throw new Error(`A palette can have at most ${MAX_PALETTE_COLOURS} colors.`);
  }

  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tagNames = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
  const tagIds: number[] = [];
  for (const tagName of tagNames) {
    insertTag.run(tagName);
    const row = getTagId.get(tagName) as { id: number } | undefined;
    if (row) tagIds.push(row.id);
  }

  const result = db.prepare("INSERT INTO palettes (name) VALUES (?)").run(name);
  const paletteId = result.lastInsertRowid;

  const insertColor = db.prepare(
    "INSERT INTO palette_colors (palette_id, name, hex, role, position) VALUES (?, ?, ?, ?, ?)"
  );
  complete.forEach((color, position) => {
    insertColor.run(paletteId, color.name, color.hex, color.role, position);
  });

  const linkTag = db.prepare(
    "INSERT OR IGNORE INTO palette_tags (palette_id, tag_id) VALUES (?, ?)",
  );
  for (const tagId of tagIds) {
    linkTag.run(paletteId, tagId);
  }

  revalidatePath("/palettes");
  redirect("/palettes");
}
