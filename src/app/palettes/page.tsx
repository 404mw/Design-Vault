export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import {
  CardCopyButton,
  EmptyPlate,
  IndexBar,
  NewButton,
  PageHeader,
  PlateGrid,
  SpecimenPlate,
} from "@/components/specimen";
import { Palette } from "lucide-react";

type PaletteRow = {
  id: number;
  name: string;
  created_at: string;
  source_screen_id: number | null;
};
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
  // name, hex, or role — or any tag attached to the palette.
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
             OR EXISTS (
               SELECT 1 FROM palette_tags pt
               JOIN tags t ON t.id = pt.tag_id
               WHERE pt.palette_id = p.id AND t.name LIKE ?
             )
             ORDER BY created_at DESC`,
          )
          .all(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      : db.prepare("SELECT * FROM palettes ORDER BY created_at DESC").all()
  ) as PaletteRow[];

  const colorsByPalette = new Map<number, ColorRow[]>();
  const tagsByPalette = new Map<number, string[]>();
  if (palettes.length > 0) {
    const allColors = db
      .prepare("SELECT * FROM palette_colors ORDER BY palette_id, position")
      .all() as ColorRow[];
    for (const color of allColors) {
      const list = colorsByPalette.get(color.palette_id) ?? [];
      list.push(color);
      colorsByPalette.set(color.palette_id, list);
    }

    const tagRows = db
      .prepare(
        `SELECT pt.palette_id, t.name FROM palette_tags pt
         JOIN tags t ON t.id = pt.tag_id
         ORDER BY t.name`,
      )
      .all() as { palette_id: number; name: string }[];
    for (const t of tagRows) {
      const list = tagsByPalette.get(t.palette_id) ?? [];
      list.push(t.name);
      tagsByPalette.set(t.palette_id, list);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<Palette />}
        title="Palettes"
        description="Colour palettes with named roles, hex values, and contrast checks."
      />
      <IndexBar
        searchName="q"
        searchPlaceholder="Search by color name, hex, role, or tag…"
        defaultSearch={search}
      >
        <NewButton href="/palettes/new">New Palette</NewButton>
      </IndexBar>

      <PlateGrid>
        {palettes.length === 0 ? (
          <EmptyPlate>
            {search ? `No palettes match "${search}".` : "No palettes yet — add your first one."}
          </EmptyPlate>
        ) : (
          palettes.map((palette) => {
            const colors = colorsByPalette.get(palette.id) ?? [];
            return (
              <SpecimenPlate
                key={palette.id}
                href={`/palettes/${palette.id}`}
                icon={<Palette />}
                title={`${colors.length} ${colors.length === 1 ? "colour" : "colours"}`}
                specs={
                  palette.source_screen_id != null
                    ? [`From screen #${palette.source_screen_id}`]
                    : undefined
                }
                linkLabel={`${colors.length}-colour palette${colors.length ? ": " + colors.map((c) => c.hex.toUpperCase()).join(", ") : ""}`}
                createdAt={palette.created_at}
                tags={tagsByPalette.get(palette.id)}
                sample={
                  <div className="h-palette-strip flex w-full overflow-hidden rounded-sample border border-line">
                    {colors.map((c) => (
                      <span
                        key={c.id}
                        className="h-full flex-1"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                }
              >
                {colors.length > 0 && (
                  <ul className="space-y-1.5">
                    {colors.map((c) => {
                      const nameIsHex = c.name.trim().toLowerCase() === c.hex.toLowerCase();
                      return (
                        <li key={c.id} className="flex items-center gap-2 text-2xs">
                          <span
                            aria-hidden
                            className="size-swatch-dot shrink-0 rounded-full border border-line"
                            style={{ backgroundColor: c.hex }}
                          />
                          {!nameIsHex && (
                            <span className="min-w-0 truncate font-medium text-ink">{c.name}</span>
                          )}
                          <span className="shrink-0 font-mono uppercase text-ink-soft">{c.hex}</span>
                          <span className="ml-auto flex shrink-0 items-center gap-2">
                            {c.role !== "any" && (
                              <span className="catalog-label text-3xs text-ink-faint">{c.role}</span>
                            )}
                            <CardCopyButton text={c.hex} label={`Copy ${c.hex.toUpperCase()}`} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SpecimenPlate>
            );
          })
        )}
      </PlateGrid>
    </div>
  );
}
