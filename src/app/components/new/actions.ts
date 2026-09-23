"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { saveUpload, saveUploadFromUrl, mediaTypeFromFilename } from "@/lib/uploads";
import { COMPONENT_TYPES, type ComponentType } from "@/lib/constants";

export type NewComponentState = {
  error?: string;
  values?: {
    name: string;
    component_type: string;
    snippet: string;
    snippet_lang: string;
    source_url: string;
    tags: string;
  };
};

function fail(error: string, values: NewComponentState["values"]): NewComponentState {
  return { error, values };
}

/**
 * Validates and inserts a new ui_components row. `name` and `component_type`
 * are required and re-validated here even though the form marks them
 * required, since that can't be trusted to client-side HTML alone.
 */
export async function createComponent(
  _prevState: NewComponentState,
  formData: FormData,
): Promise<NewComponentState> {
  const name = String(formData.get("name") ?? "").trim();
  const component_type = String(formData.get("component_type") ?? "").trim();
  const snippet = String(formData.get("snippet") ?? "").trim();
  const snippet_lang = String(formData.get("snippet_lang") ?? "").trim();
  const source_url = String(formData.get("source_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const draggedUrl = String(formData.get("dragged_url") ?? "").trim();
  const file = formData.get("file");

  const values = {
    name,
    component_type,
    snippet,
    snippet_lang,
    source_url,
    tags: tagsRaw,
  };

  if (!name) {
    return fail("Name is required.", values);
  }
  if (!COMPONENT_TYPES.includes(component_type as ComponentType)) {
    return fail("Choose a valid component type.", values);
  }

  let filePath: string;
  if (file instanceof File && file.size > 0) {
    filePath = await saveUpload(file, "components");
  } else if (draggedUrl) {
    try {
      filePath = await saveUploadFromUrl(draggedUrl, "components");
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
      `INSERT INTO ui_components
        (name, component_type, media_type, file_path, snippet, snippet_lang, source_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      values.name,
      component_type,
      media_type,
      filePath,
      snippet || null,
      snippet_lang || null,
      source_url || null,
    );

  const componentId = Number(result.lastInsertRowid);

  const linkTag = db.prepare(
    "INSERT OR IGNORE INTO ui_component_tags (component_id, tag_id) VALUES (?, ?)",
  );
  for (const tagId of tagIds) {
    linkTag.run(componentId, tagId);
  }

  revalidatePath("/components");
  redirect("/components");
}
