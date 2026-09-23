import { db } from "@/lib/db";
import type { ScreenInitialValues } from "../../new/NewScreenForm";
import type { MediaType, Verdict } from "@/lib/constants";

type ScreenRow = {
  id: number;
  media_type: MediaType;
  file_path: string;
  page_type: string;
  layout_pattern: string;
  verdict: Verdict;
  why: string;
  snippet: string | null;
  snippet_lang: string | null;
  source_url: string | null;
};

/** Shared between the full-page `/screens/[id]/edit` route and its `@modal` intercepted counterpart. */
export function loadEditScreenInitial(id: string): {
  initial: ScreenInitialValues;
  tagNames: string[];
  linkedPaletteId: number | null;
} | null {
  const screenId = Number(id);
  if (!Number.isInteger(screenId)) return null;

  const screen = db.prepare("SELECT * FROM ui_screens WHERE id = ?").get(screenId) as
    | ScreenRow
    | undefined;
  if (!screen) return null;

  const tagRows = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN ui_screen_tags ust ON ust.tag_id = t.id
       WHERE ust.screen_id = ?
       ORDER BY t.name`,
    )
    .all(screenId) as { name: string }[];

  const allTags = db.prepare("SELECT name FROM tags ORDER BY name").all() as { name: string }[];

  const linkedPalette = db
    .prepare("SELECT id FROM palettes WHERE source_screen_id = ? LIMIT 1")
    .get(screenId) as { id: number } | undefined;

  return {
    initial: {
      id: screen.id,
      page_type: screen.page_type,
      layout_pattern: screen.layout_pattern,
      verdict: screen.verdict,
      why: screen.why,
      snippet: screen.snippet ?? "",
      snippet_lang: screen.snippet_lang ?? "",
      source_url: screen.source_url ?? "",
      tags: tagRows.map((t) => t.name).join(", "),
      media_type: screen.media_type,
      file_path: screen.file_path,
    },
    tagNames: allTags.map((t) => t.name),
    linkedPaletteId: linkedPalette?.id ?? null,
  };
}
