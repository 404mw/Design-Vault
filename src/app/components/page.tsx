import Link from "next/link";
import {
  IndexBar,
  FilterSelect,
  PlateGrid,
  SpecimenPlate,
  EmptyPlate,
} from "@/components/specimen";
import { COMPONENT_TYPES } from "@/lib/constants";
import type { MediaType } from "@/lib/constants";
import { db } from "@/lib/db";

// Reads the DB directly on every request — must not be statically cached.
export const dynamic = "force-dynamic";

type ComponentRow = {
  id: number;
  media_type: MediaType;
  file_path: string;
  name: string;
  component_type: string;
};

export default async function ComponentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const componentType = typeof sp.component_type === "string" ? sp.component_type : "";

  const conditions: string[] = [];
  const params: string[] = [];

  if (q) {
    conditions.push(`(
      c.name LIKE ? OR
      c.component_type LIKE ? OR
      EXISTS (
        SELECT 1 FROM ui_component_tags uct
        JOIN tags t ON t.id = uct.tag_id
        WHERE uct.component_id = c.id AND t.name LIKE ?
      )
    )`);
    const like = `%${q}%`;
    params.push(like, like, like);
  }

  if (componentType && (COMPONENT_TYPES as readonly string[]).includes(componentType)) {
    conditions.push("c.component_type = ?");
    params.push(componentType);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT c.id, c.media_type, c.file_path, c.name, c.component_type
       FROM ui_components c
       ${where}
       ORDER BY c.id DESC`,
    )
    .all(...params) as ComponentRow[];

  const tagsByComponent = new Map<number, string[]>();
  if (rows.length > 0) {
    const tagRows = db
      .prepare(
        `SELECT uct.component_id, t.name FROM ui_component_tags uct
         JOIN tags t ON t.id = uct.tag_id
         ORDER BY t.name`,
      )
      .all() as { component_id: number; name: string }[];
    for (const t of tagRows) {
      const list = tagsByComponent.get(t.component_id) ?? [];
      list.push(t.name);
      tagsByComponent.set(t.component_id, list);
    }
  }

  const hasFilters = Boolean(q || componentType);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-2xl text-ink">UI Components</h1>
        <Link
          href="/components/new"
          className="catalog-label whitespace-nowrap border border-ink bg-ink px-4 py-2 text-2xs text-paper transition-colors hover:border-accent hover:bg-accent"
        >
          + New Component
        </Link>
      </div>

      <IndexBar
        searchName="q"
        searchPlaceholder="Search name, type, tags…"
        defaultSearch={q}
      >
        <FilterSelect name="component_type" label="Type" options={COMPONENT_TYPES} defaultValue={componentType} />
      </IndexBar>

      <PlateGrid>
        {rows.length === 0 ? (
          <EmptyPlate>
            {hasFilters
              ? "No components match these filters."
              : "No components filed yet — add the first one."}
          </EmptyPlate>
        ) : (
          rows.map((row) => (
            <SpecimenPlate
              key={row.id}
              href={`/components/${row.id}`}
              sample={
                row.media_type === "video" ? (
                  <video
                    src={row.file_path}
                    className="h-full w-full object-cover object-top"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.file_path}
                    alt={row.name}
                    className="h-full w-full object-cover object-top"
                  />
                )
              }
              title={row.name}
              specs={[row.component_type]}
              tags={tagsByComponent.get(row.id)}
            />
          ))
        )}
      </PlateGrid>
    </div>
  );
}
