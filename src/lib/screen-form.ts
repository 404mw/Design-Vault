import { db } from "@/lib/db";
import {
  PAGE_TYPES,
  LAYOUT_PATTERNS,
  VERDICTS,
  type PageType,
  type LayoutPattern,
  type Verdict,
} from "@/lib/constants";

export type ScreenFormValues = {
  page_type: string;
  layout_pattern: string;
  verdict: string;
  why: string;
  snippet: string;
  snippet_lang: string;
  source_url: string;
  tags: string;
};

/**
 * Pulls and validates the fields shared by both `createScreen` and
 * `updateScreen` — page type, layout pattern, and verdict against their
 * fixed vocabularies. Re-validated here even though the form marks some
 * required, since client-side `required` can't be trusted alone. `why` is
 * deliberately optional (Constitution Rule 002).
 */
export function readScreenFormValues(formData: FormData): {
  values: ScreenFormValues;
  error: string | null;
} {
  const values: ScreenFormValues = {
    page_type: String(formData.get("page_type") ?? "").trim(),
    layout_pattern: String(formData.get("layout_pattern") ?? "").trim(),
    verdict: String(formData.get("verdict") ?? "").trim(),
    why: String(formData.get("why") ?? "").trim(),
    snippet: String(formData.get("snippet") ?? "").trim(),
    snippet_lang: String(formData.get("snippet_lang") ?? "").trim(),
    source_url: String(formData.get("source_url") ?? "").trim(),
    tags: String(formData.get("tags") ?? "").trim(),
  };

  let error: string | null = null;
  if (!PAGE_TYPES.includes(values.page_type as PageType)) {
    error = "Choose a valid page type.";
  } else if (!LAYOUT_PATTERNS.includes(values.layout_pattern as LayoutPattern)) {
    error = "Choose a valid layout pattern.";
  } else if (!VERDICTS.includes(values.verdict as Verdict)) {
    error = "Choose a verdict — love or hate.";
  }

  return { values, error };
}

export function parseTagNames(tagsRaw: string): string[] {
  return Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/** Upserts each tag name into the shared `tags` table and returns their ids. */
export function upsertTagIds(tagNames: string[]): number[] {
  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
  const tagIds: number[] = [];
  for (const name of tagNames) {
    insertTag.run(name);
    const row = getTagId.get(name) as { id: number } | undefined;
    if (row) tagIds.push(row.id);
  }
  return tagIds;
}
