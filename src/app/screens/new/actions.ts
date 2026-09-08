"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { saveUpload, saveUploadFromUrl, mediaTypeFromFilename } from "@/lib/uploads";
import {
  PAGE_TYPES,
  LAYOUT_PATTERNS,
  VERDICTS,
  type PageType,
  type LayoutPattern,
  type Verdict,
} from "@/lib/constants";

export type NewScreenState = {
  error?: string;
  values?: {
    page_type: string;
    layout_pattern: string;
    verdict: string;
    why: string;
    snippet: string;
    snippet_lang: string;
    source_url: string;
    tags: string;
  };
};

function fail(error: string, values: NewScreenState["values"]): NewScreenState {
  return { error, values };
}

/**
 * Validates and inserts a new ui_screens row. `verdict` is required and
 * re-validated here even though the form marks it required, since that
 * can't be trusted to client-side HTML alone. `why` is deliberately optional.
 */
export async function createScreen(
  _prevState: NewScreenState,
  formData: FormData,
): Promise<NewScreenState> {
  const page_type = String(formData.get("page_type") ?? "").trim();
  const layout_pattern = String(formData.get("layout_pattern") ?? "").trim();
  const verdict = String(formData.get("verdict") ?? "").trim();
  const why = String(formData.get("why") ?? "").trim();
  const snippet = String(formData.get("snippet") ?? "").trim();
  const snippet_lang = String(formData.get("snippet_lang") ?? "").trim();
  const source_url = String(formData.get("source_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const draggedUrl = String(formData.get("dragged_url") ?? "").trim();
  const file = formData.get("file");

  const values = {
    page_type,
    layout_pattern,
    verdict,
    why,
    snippet,
    snippet_lang,
    source_url,
    tags: tagsRaw,
  };

  if (!PAGE_TYPES.includes(page_type as PageType)) {
    return fail("Choose a valid page type.", values);
  }
  if (!LAYOUT_PATTERNS.includes(layout_pattern as LayoutPattern)) {
    return fail("Choose a valid layout pattern.", values);
  }
  if (!VERDICTS.includes(verdict as Verdict)) {
    return fail("Choose a verdict — love or hate.", values);
  }

  let filePath: string;
  if (file instanceof File && file.size > 0) {
    filePath = await saveUpload(file, "screens");
  } else if (draggedUrl) {
    try {
      filePath = await saveUploadFromUrl(draggedUrl, "screens");
    } catch {
      return fail(
        "Could not fetch that dragged URL — try pasting or picking the file directly instead.",
        values,
      );
    }
  } else {
    return fail("Add an image or video — paste, drag from a tab, or choose a file.", values);
  }

  const media_type = mediaTypeFromFilename(filePath);

  const tagNames = Array.from(
    new Set(
      tagsRaw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)");
  const getTagId = db.prepare("SELECT id FROM tags WHERE name = ?");
  const tagIds: number[] = [];
  for (const name of tagNames) {
    insertTag.run(name);
    const row = getTagId.get(name) as { id: number } | undefined;
    if (row) tagIds.push(row.id);
  }

  const result = db
    .prepare(
      `INSERT INTO ui_screens
        (media_type, file_path, page_type, layout_pattern, verdict, why, snippet, snippet_lang, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      media_type,
      filePath,
      page_type,
      layout_pattern,
      verdict,
      why,
      snippet || null,
      snippet_lang || null,
      source_url || null,
    );

  const screenId = Number(result.lastInsertRowid);

  const linkTag = db.prepare(
    "INSERT OR IGNORE INTO ui_screen_tags (screen_id, tag_id) VALUES (?, ?)",
  );
  for (const tagId of tagIds) {
    linkTag.run(screenId, tagId);
  }

  redirect("/screens");
}
