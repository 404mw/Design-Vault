import { LayoutGrid } from "lucide-react";
import {
  IndexBar,
  FilterSelect,
  PlateGrid,
  SpecimenPlate,
  EmptyPlate,
  PageHeader,
  NewButton,
} from "@/components/specimen";
import { PAGE_TYPES, LAYOUT_PATTERNS, VERDICTS } from "@/lib/constants";
import type { MediaType, Verdict } from "@/lib/constants";
import { db } from "@/lib/db";

// Reads the DB directly on every request — must not be statically cached.
export const dynamic = "force-dynamic";

type ScreenRow = {
  id: number;
  media_type: MediaType;
  file_path: string;
  page_type: string;
  layout_pattern: string;
  verdict: Verdict;
  why: string;
  created_at: string;
};

export default async function ScreensPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pageType = typeof sp.page_type === "string" ? sp.page_type : "";
  const layoutPattern = typeof sp.layout_pattern === "string" ? sp.layout_pattern : "";
  const verdict = typeof sp.verdict === "string" ? sp.verdict : "";

  const conditions: string[] = [];
  const params: string[] = [];

  if (q) {
    conditions.push(`(
      s.why LIKE ? OR
      s.page_type LIKE ? OR
      s.layout_pattern LIKE ? OR
      EXISTS (
        SELECT 1 FROM ui_screen_tags ust
        JOIN tags t ON t.id = ust.tag_id
        WHERE ust.screen_id = s.id AND t.name LIKE ?
      )
    )`);
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (pageType && (PAGE_TYPES as readonly string[]).includes(pageType)) {
    conditions.push("s.page_type = ?");
    params.push(pageType);
  }

  if (layoutPattern && (LAYOUT_PATTERNS as readonly string[]).includes(layoutPattern)) {
    conditions.push("s.layout_pattern = ?");
    params.push(layoutPattern);
  }

  if (verdict && (VERDICTS as readonly string[]).includes(verdict)) {
    conditions.push("s.verdict = ?");
    params.push(verdict);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `SELECT s.id, s.media_type, s.file_path, s.page_type, s.layout_pattern, s.verdict, s.why, s.created_at
       FROM ui_screens s
       ${where}
       ORDER BY s.id DESC`,
    )
    .all(...params) as ScreenRow[];

  const tagsByScreen = new Map<number, string[]>();
  if (rows.length > 0) {
    const tagRows = db
      .prepare(
        `SELECT ust.screen_id, t.name FROM ui_screen_tags ust
         JOIN tags t ON t.id = ust.tag_id
         ORDER BY t.name`,
      )
      .all() as { screen_id: number; name: string }[];
    for (const t of tagRows) {
      const list = tagsByScreen.get(t.screen_id) ?? [];
      list.push(t.name);
      tagsByScreen.set(t.screen_id, list);
    }
  }

  const hasFilters = Boolean(q || pageType || layoutPattern || verdict);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={<LayoutGrid />}
        title="UI Screens"
        description="Saved screens and layouts, filed with a verdict and a reason."
      />

      <IndexBar
        searchName="q"
        searchPlaceholder="Search why, page type, tags…"
        defaultSearch={q}
      >
        <FilterSelect name="page_type" label="Page type" options={PAGE_TYPES} defaultValue={pageType} />
        <FilterSelect name="layout_pattern" label="Layout" options={LAYOUT_PATTERNS} defaultValue={layoutPattern} />
        <FilterSelect name="verdict" label="Verdict" options={VERDICTS} defaultValue={verdict} />
        <NewButton href="/screens/new">New Screen</NewButton>
      </IndexBar>

      <PlateGrid>
        {rows.length === 0 ? (
          <EmptyPlate>
            {hasFilters
              ? "No screens match these filters."
              : "No screens filed yet — add the first one."}
          </EmptyPlate>
        ) : (
          rows.map((row) => (
            <SpecimenPlate
              key={row.id}
              href={`/screens/${row.id}`}
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
                    alt={row.why || `${row.page_type} screen`}
                    className="h-auto w-full max-h-plate-media object-cover object-top"
                  />
                )
              }
              icon={<LayoutGrid />}
              title={row.page_type.charAt(0).toUpperCase() + row.page_type.slice(1)}
              description={row.why || undefined}
              specs={[row.layout_pattern]}
              createdAt={row.created_at}
              tags={tagsByScreen.get(row.id)}
              verdict={row.verdict}
            />
          ))
        )}
      </PlateGrid>
    </div>
  );
}
