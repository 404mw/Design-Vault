"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

// palette_colors rows cascade-delete via the schema's ON DELETE CASCADE
// (foreign_keys pragma is already enabled in src/lib/db.ts).
export async function deletePalette(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid palette id.");
  }

  const palette = db.prepare("SELECT source_screen_id FROM palettes WHERE id = ?").get(id) as
    | { source_screen_id: number | null }
    | undefined;

  db.prepare("DELETE FROM palettes WHERE id = ?").run(id);

  revalidatePath("/palettes");
  // The source screen's detail view links to this palette — that link needs
  // to disappear along with it.
  if (palette?.source_screen_id) {
    revalidatePath(`/screens/${palette.source_screen_id}`);
  }

  redirect("/palettes");
}
