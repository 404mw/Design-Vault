import { db } from "@/lib/db";

type PaletteRow = { id: number; name: string };
type ColorRow = { name: string; hex: string; role: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const paletteId = Number(id);
  if (!Number.isInteger(paletteId)) {
    return new Response("Not found", { status: 404 });
  }

  const palette = db.prepare("SELECT * FROM palettes WHERE id = ?").get(paletteId) as
    | PaletteRow
    | undefined;
  if (!palette) {
    return new Response("Not found", { status: 404 });
  }

  const colors = db
    .prepare("SELECT name, hex, role FROM palette_colors WHERE palette_id = ? ORDER BY position")
    .all(paletteId) as ColorRow[];

  const lines = colors.map(
    (c) => `  --color-${c.role}-${slugify(c.name) || "swatch"}: ${c.hex};`
  );
  const css = `:root {\n${lines.join("\n")}\n}\n`;

  const filename = `palette-${palette.id}-tokens.css`;

  return new Response(css, {
    headers: {
      "Content-Type": "text/css",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
