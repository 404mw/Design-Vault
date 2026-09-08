import Link from "next/link";
import { db } from "@/lib/db";
import { IndexBar, FilterSelect, PlateGrid, SpecimenPlate, EmptyPlate } from "@/components/specimen";
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

  const variantCounts = new Map<number, number>();
  if (rows.length > 0) {
    const counts = db
      .prepare(
        `SELECT font_id, COUNT(*) c FROM font_files WHERE font_id IN (${rows.map(() => "?").join(",")}) GROUP BY font_id`,
      )
      .all(...rows.map((r) => r.id)) as { font_id: number; c: number }[];
    for (const c of counts) variantCounts.set(c.font_id, c.c);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-display text-2xl text-ink">Fonts</h1>
        <Link
          href="/fonts/new"
          className="catalog-label border border-ink bg-ink px-5 py-2.5 text-2xs text-paper transition-colors hover:bg-accent hover:border-accent"
        >
          + New Font
        </Link>
      </div>

      <IndexBar
        searchName="q"
        searchPlaceholder="Search by family or foundry…"
        defaultSearch={query}
      >
        <FilterSelect name="licence" label="Licence" options={LICENCES} defaultValue={licence} />
      </IndexBar>

      <PlateGrid>
        {rows.length === 0 ? (
          <EmptyPlate>
            {hasFilters ? "No fonts match these filters." : "No fonts saved yet"}
          </EmptyPlate>
        ) : (
          rows.map((row) => {
            const extra = variantCounts.get(row.id) ?? 0;
            const variantSpec = extra > 0 ? `${extra + 1} variants` : row.weights;
            return (
              <SpecimenPlate
                key={row.id}
                href={`/fonts/${row.id}`}
                title={row.family_name}
                specs={[variantSpec, row.licence]}
                sample={
                  <div className="flex h-full items-center justify-center p-4">
                    <FontFace
                      id={row.id}
                      filePath={row.file_path}
                      familyName={row.family_name}
                      className="text-center text-2xl leading-tight text-ink break-words"
                    >
                      {row.family_name}
                    </FontFace>
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
