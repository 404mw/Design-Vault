"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveUpload, saveUploadFromUrl, mediaTypeFromFilename } from "@/lib/uploads";
import { readScreenFormValues, parseTagNames, upsertTagIds } from "@/lib/screen-form";
import { createPaletteFromHexes, parseSavePaletteRequest } from "@/lib/palettes";

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
 * Validates and inserts a new ui_screens row, and optionally a companion
 * palette from the "Colours" picker on the form (see src/lib/palettes.ts).
 */
export async function createScreen(
  _prevState: NewScreenState,
  formData: FormData,
): Promise<NewScreenState> {
  const { values, error } = readScreenFormValues(formData);
  if (error) return fail(error, values);
  const { page_type, layout_pattern, verdict, why, snippet, snippet_lang, source_url, tags: tagsRaw } =
    values;

  const draggedUrl = String(formData.get("dragged_url") ?? "").trim();
  const file = formData.get("file");

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

  const savePalette = parseSavePaletteRequest(formData);
  if (savePalette.error) {
    return fail(savePalette.error, values);
  }

  const tagIds = upsertTagIds(parseTagNames(tagsRaw));

  let screenId = 0;
  db.exec("BEGIN");
  try {
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

    screenId = Number(result.lastInsertRowid);

    const linkTag = db.prepare(
      "INSERT OR IGNORE INTO ui_screen_tags (screen_id, tag_id) VALUES (?, ?)",
    );
    for (const tagId of tagIds) {
      linkTag.run(screenId, tagId);
    }

    if (savePalette.requested && savePalette.hexes.length >= 2) {
      createPaletteFromHexes(savePalette.hexes, tagIds, screenId);
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  revalidatePath("/screens");
  if (savePalette.requested && savePalette.hexes.length >= 2) {
    revalidatePath("/palettes");
  }
  redirect("/screens");
}
