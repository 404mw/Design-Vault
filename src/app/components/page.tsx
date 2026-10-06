import { Code, Component, Link as Link2 } from "lucide-react";
import {
  CardCopyButton,
  CardLinkButton,
  IndexBar,
  FilterSelect,
  PlateGrid,
  SpecimenPlate,
  EmptyPlate,
  PageHeader,
  NewButton,
} from "@/components/specimen";
import { COMPONENT_TYPES } from "@/lib/constants";
import type { MediaType } from "@/lib/constants";
import { db } from "@/lib/db";
import { safeHttpUrl } from "@/lib/urls";

// Reads the DB directly on every request — must not be statically cached.
export const dynamic = "force-dynamic";

type ComponentRow = {
  id: number;
  media_type: MediaType;
  file_path: string;
  name: string;
  component_type: string;
  created_at: string;
  snippet: string | null;
  snippet_lang: string | null;
  source_url: string | null;
};

// `url` has already passed safeHttpUrl, so it always parses.
function sourceHost(url: string): string {
  return new URL(url).hostname;
}

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
      `SELECT c.id, c.media_type, c.file_path, c.name, c.component_type, c.created_at,
              c.snippet, c.snippet_lang, c.source_url
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
      <PageHeader
        icon={<Component />}
        title="UI Components"
        description="Buttons, cards, and other interface pieces worth reusing."
      />

      <IndexBar
        searchName="q"
        searchPlaceholder="Search name, type, tags…"
        defaultSearch={q}
      >
        <FilterSelect name="component_type" label="Type" options={COMPONENT_TYPES} defaultValue={componentType} />
        <NewButton href="/components/new">New Component</NewButton>
      </IndexBar>

      <PlateGrid>
        {rows.length === 0 ? (
          <EmptyPlate>
            {hasFilters
              ? "No components match these filters."
              : "No components filed yet — add the first one."}
          </EmptyPlate>
        ) : (
          rows.map((row) => {
            const hasSnippet = Boolean(row.snippet);
            const sourceUrl = safeHttpUrl(row.source_url);
            const hasSource = sourceUrl !== null;
            return (
            <SpecimenPlate
              key={row.id}
              href={`/components/${row.id}`}
              sample={
                row.media_type === "video" ? (
                  <video
                    src={row.file_path}
                    className="h-auto w-full max-h-plate-media object-cover object-top"
                    muted
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.file_path}
                    alt={row.name}
                    className="h-auto w-full max-h-plate-media object-cover object-top"
                  />
                )
              }
              icon={<Component />}
              title={row.name}
              createdAt={row.created_at}
              specs={[row.component_type]}
              tags={tagsByComponent.get(row.id)}
            >
              {(hasSnippet || hasSource) && (
                <ul className="space-y-1.5">
                  {hasSnippet && (
                    <li className="flex items-center gap-2 text-2xs">
                      <Code aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
                      <span className="min-w-0 truncate text-ink-soft">
                        {row.snippet_lang ? `${row.snippet_lang.toUpperCase()} snippet` : "Snippet"}
                      </span>
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        <CardCopyButton text={row.snippet ?? ""} label={`Copy ${row.name} snippet`} />
                      </span>
                    </li>
                  )}
                  {sourceUrl && (
                    <li className="flex items-center gap-2 text-2xs">
                      <Link2 aria-hidden className="size-3.5 shrink-0 text-ink-faint" />
                      <span className="min-w-0 truncate text-ink-soft">{sourceHost(sourceUrl)}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        <CardLinkButton href={sourceUrl} label={`Open source for ${row.name}`} />
                      </span>
                    </li>
                  )}
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
