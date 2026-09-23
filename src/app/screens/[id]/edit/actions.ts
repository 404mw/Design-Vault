"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveUpload, saveUploadFromUrl, mediaTypeFromFilename, deleteUpload } from "@/lib/uploads";
import { readScreenFormValues, parseTagNames, upsertTagIds } from "@/lib/screen-form";
import { createPaletteFromHexes, parseSavePaletteRequest } from "@/lib/palettes";
import type { NewScreenState } from "../../new/actions";
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

function fail(error: string, values: NewScreenState["values"]): NewScreenState {
  return { error, values };
}

/**
 * Same validation as `createScreen`, applied to an existing ui_screens row.
 * Media is optional here — omitting a new file/dragged URL keeps the
 * current one; providing either replaces it and deletes the old file from
 * disk. Colours (see src/lib/palettes.ts) are only accepted if the screen
 * doesn't already have a linked palette — palettes aren't editable, so once
 * one exists the picker doesn't apply.
 */
export async function updateScreen(
  screenId: number,
  _prevState: NewScreenState,
  formData: FormData,
): Promise<NewScreenState> {
  const { values, error } = readScreenFormValues(formData);
  if (error) return fail(error, values);
  const { page_type, layout_pattern, verdict, why, snippet, snippet_lang, source_url, tags: tagsRaw } =
    values;

  const existing = db.prepare("SELECT * FROM ui_screens WHERE id = ?").get(screenId) as
    | ScreenRow
    | undefined;
  if (!existing) {
    return fail("This specimen no longer exists.", values);
  }

  const draggedUrl = String(formData.get("dragged_url") ?? "").trim();
  const file = formData.get("file");

  let filePath = existing.file_path;
  let oldFilePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    filePath = await saveUpload(file, "screens");
    oldFilePath = existing.file_path;
  } else if (draggedUrl) {
    try {
      filePath = await saveUploadFromUrl(draggedUrl, "screens");
      oldFilePath = existing.file_path;
    } catch {
      return fail(
        "Could not fetch that dragged URL — try pasting or picking the file directly instead.",
        values,
      );
    }
  }

  const media_type = filePath === existing.file_path ? existing.media_type : mediaTypeFromFilename(filePath);

  const hasLinkedPalette = Boolean(
    db.prepare("SELECT 1 FROM palettes WHERE source_screen_id = ? LIMIT 1").get(screenId),
  );

  const savePalette = hasLinkedPalette
    ? { requested: false, hexes: [] as string[], error: undefined as string | undefined }
    : parseSavePaletteRequest(formData);
  if (savePalette.error) {
    return fail(savePalette.error, values);
  }

  const tagIds = upsertTagIds(parseTagNames(tagsRaw));
  let paletteCreated = false;

  db.exec("BEGIN");
  try {
    db.prepare(
      `UPDATE ui_screens
       SET media_type = ?, file_path = ?, page_type = ?, layout_pattern = ?, verdict = ?,
           why = ?, snippet = ?, snippet_lang = ?, source_url = ?
       WHERE id = ?`,
    ).run(
      media_type,
      filePath,
      page_type,
      layout_pattern,
      verdict,
      why,
      snippet || null,
      snippet_lang || null,
      source_url || null,
      screenId,
    );

    db.prepare("DELETE FROM ui_screen_tags WHERE screen_id = ?").run(screenId);
    const linkTag = db.prepare(
      "INSERT OR IGNORE INTO ui_screen_tags (screen_id, tag_id) VALUES (?, ?)",
    );
    for (const tagId of tagIds) {
      linkTag.run(screenId, tagId);
    }

    if (savePalette.requested && savePalette.hexes.length >= 2) {
      createPaletteFromHexes(savePalette.hexes, tagIds, screenId);
      paletteCreated = true;
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  if (oldFilePath) {
    await deleteUpload(oldFilePath, "screens");
  }

  revalidatePath("/screens");
  revalidatePath(`/screens/${screenId}`);
  if (paletteCreated) {
    revalidatePath("/palettes");
  }
  redirect(`/screens/${screenId}`);
}
