import { Type } from "lucide-react";
import { db } from "@/lib/db";
import { IndexBar, FilterSelect, PlateGrid, SpecimenPlate, EmptyPlate, PageHeader, NewButton, CardCopyButton } from "@/components/specimen";
import { LICENCES } from "@/lib/constants";
import { FontFace } from "./FontFace";

export const dynamic = "force-dynamic";

type FontRow = {
  id: number;
  family_name: string;
  weights: string;
  file_path: string;
  foundry: string | null;
  source_url: string | null;
  licence: string;
  created_at: string;
};

type ExtraFile = { id: number; font_id: number; file_path: string; weight_label: string };

const MAX_VARIANT_ROWS = 4;

export default async function FontsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; licence?: string }>;
}) {
  const { q, licence: licenceParam } = await searchParams;
  const query = (q ?? "").trim();
  const licence =
    licenceParam && (LICENCES as readonly string[]).includes(licenceParam) ? licenceParam : "";

  // Browse-first: the grid always renders; search and filters narrow it,
  // they never gate it.
  const conditions: string[] = [];
  const params: string[] = [];

  if (query) {
    conditions.push("(family_name LIKE ? OR foundry LIKE ?)");
    params.push(`%${query}%`, `%${query}%`);
  }

  if (licence) {
    conditions.push("licence = ?");
    params.push(licence);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(`SELECT * FROM fonts ${where} ORDER BY id DESC`)
    .all(...params) as FontRow[];

  const hasFilters = Boolean(query || licence);

  const extraFiles = new Map<number, ExtraFile[]>();
  if (rows.length > 0) {
    const files = db
      .prepare(
        `SELECT id, font_id, file_path, weight_label FROM font_files
         WHERE font_id IN (${rows.map(() => "?").join(",")})
         ORDER BY font_id, position, id`,
      )
      .all(...rows.map((r) => r.id)) as ExtraFile[];
    for (const f of files) {
      const list = extraFiles.get(f.font_id) ?? [];
      list.push(f);
      extraFiles.set(f.font_id, list);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Type />}
        title="Fonts"
        description="Typefaces saved with their licence, ready to preview and compare."
      />

      <IndexBar
        searchName="q"
        searchPlaceholder="Search by family or foundry…"
        defaultSearch={query}
      >
        <FilterSelect name="licence" label="Licence" options={LICENCES} defaultValue={licence} />
        <NewButton href="/fonts/new">New Font</NewButton>
      </IndexBar>

      <PlateGrid>
        {rows.length === 0 ? (
          <EmptyPlate>
            {hasFilters ? "No fonts match these filters." : "No fonts saved yet"}
          </EmptyPlate>
        ) : (
          rows.map((row) => {
            const extras = extraFiles.get(row.id) ?? [];
            const extra = extras.length;
            const variantSpec = extra > 0 ? `${extra + 1} variants` : row.weights;
            // Primary file first, then the extra font_files rows. Each variant
            // gets its own FontFace id so family names never collide with the
            // sample's `specimen-{id}`.
            const variants = [
              { key: "v0", filePath: row.file_path, label: row.weights.trim() || "Regular" },
              ...extras.map((f) => ({
                key: `v${f.id}`,
                filePath: f.file_path,
                label: f.weight_label.trim() || "Regular",
              })),
            ];
            const hiddenCount = variants.length - MAX_VARIANT_ROWS;
            const escapedFamily = row.family_name.replace(/[\\"]/g, "\\$&");
            const cssFamilyDecl = `font-family: "${escapedFamily}";`;
            return (
              <SpecimenPlate
                key={row.id}
                href={`/fonts/${row.id}`}
                icon={<Type />}
                title={row.family_name}
                createdAt={row.created_at}
                specs={[row.foundry, variantSpec, row.licence].filter((s): s is string => Boolean(s))}
                sample={
                  <div className="min-h-font-sample flex items-center justify-center p-6">
                    <FontFace
                      id={row.id}
                      filePath={row.file_path}
                      familyName={row.family_name}
                      className="text-center text-3xl leading-tight text-ink break-words"
                    >
                      {row.family_name}
                    </FontFace>
                  </div>
                }
              >
                <ul className="space-y-1.5">
                  <li className="flex items-center gap-2 text-2xs">
                    <span className="min-w-0 truncate font-mono text-ink-soft">{cssFamilyDecl}</span>
                    <span className="ml-auto flex shrink-0 items-center gap-2">
                      <CardCopyButton
                        text={cssFamilyDecl}
                        label={`Copy font-family for ${row.family_name}`}
                      />
                    </span>
                  </li>
                  {variants.slice(0, MAX_VARIANT_ROWS).map((v) => (
                    <li key={v.key} className="flex items-center gap-2 text-2xs">
                      <FontFace
                        id={`f${row.id}-${v.key}`}
                        filePath={v.filePath}
                        className="min-w-0 truncate text-ink"
                      >
                        {v.label}
                      </FontFace>
                    </li>
                  ))}
                  {hiddenCount > 0 && (
                    <li className="text-2xs text-ink-faint">+{hiddenCount} more</li>
                  )}
                </ul>
              </SpecimenPlate>
            );
          })
        )}
      </PlateGrid>
    </div>
  );
}
