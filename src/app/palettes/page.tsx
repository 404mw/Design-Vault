export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { EmptyPlate, IndexBar, PlateGrid, SpecimenPlate } from "@/components/specimen";
import { pickPillColor } from "@/lib/contrast";
import Link from "next/link";

type PaletteRow = { id: number; name: string; created_at: string };
type ColorRow = {
  id: number;
  palette_id: number;
  name: string;
  hex: string;
  role: string;
  position: number;
};

// Browse-first landing (confirmed override of the sourced brief's
// search-only empty state): the grid always renders; search narrows it, it
// never gates it.
export default async function PalettesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const search = (q ?? "").trim();

  // Palettes carry no user-facing name (removed from the form/display), so
  // search matches against what's actually visible instead: each color's
  // name, hex, or role.
  const palettes = (
    search
      ? db
          .prepare(
            `SELECT * FROM palettes p
             WHERE EXISTS (
               SELECT 1 FROM palette_colors pc
               WHERE pc.palette_id = p.id
                 AND (pc.name LIKE ? OR pc.hex LIKE ? OR pc.role LIKE ?)
             )
             ORDER BY created_at DESC`,
          )
          .all(`%${search}%`, `%${search}%`, `%${search}%`)
      : db.prepare("SELECT * FROM palettes ORDER BY created_at DESC").all()
  ) as PaletteRow[];

  const colorsByPalette = new Map<number, ColorRow[]>();
  if (palettes.length > 0) {
    const allColors = db
      .prepare("SELECT * FROM palette_colors ORDER BY palette_id, position")
      .all() as ColorRow[];
    for (const color of allColors) {
      const list = colorsByPalette.get(color.palette_id) ?? [];
      list.push(color);
      colorsByPalette.set(color.palette_id, list);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <h1 className="font-display text-2xl text-ink">Palettes</h1>
        </div>
        <IndexBar
          searchName="q"
          searchPlaceholder="Search by color name, hex, or role…"
          defaultSearch={search}
        >
          <Link
            href="/palettes/new"
            className="catalog-label whitespace-nowrap border border-ink bg-ink px-5 py-2.5 text-2xs text-paper transition-colors hover:border-accent hover:bg-accent"
          >
            + New Palette
          </Link>
        </IndexBar>
      </div>

      <PlateGrid>
        {palettes.length === 0 ? (
          <EmptyPlate>
            {search ? `No palettes match "${search}".` : "No palettes yet — add your first one."}
          </EmptyPlate>
        ) : (
          palettes.map((palette) => {
            const colors = colorsByPalette.get(palette.id) ?? [];
            const narrow = colors.length > 3;
            const siblingHexes = colors.map((c) => c.hex);
            return (
              <SpecimenPlate
                key={palette.id}
                href={`/palettes/${palette.id}`}
                specs={[`${colors.length} color${colors.length === 1 ? "" : "s"}`]}
                sample={
                  <div className="flex h-full w-full">
                    {colors.map((c) => (
                      <span
                        key={c.id}
                        className="relative flex h-full flex-1 items-center justify-center overflow-hidden"
                        style={{ backgroundColor: c.hex }}
                      >
                        <span
                          className={`catalog-label rounded-full px-2 py-0.5 text-center text-3xs leading-tight ${
                            narrow ? "-rotate-90 whitespace-nowrap" : "line-clamp-2 break-words"
                          }`}
                          style={{ backgroundColor: pickPillColor(c.hex, siblingHexes), color: c.hex }}
                        >
                          {c.name}
                        </span>
                      </span>
                    ))}
                  </div>
                }
              />
            );
          })
        )}
      </PlateGrid>
    </div>
  );
}
