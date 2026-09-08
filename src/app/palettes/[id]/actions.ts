"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// palette_colors rows cascade-delete via the schema's ON DELETE CASCADE
// (foreign_keys pragma is already enabled in src/lib/db.ts).
export async function deletePalette(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) {
    throw new Error("Invalid palette id.");
  }
  db.prepare("DELETE FROM palettes WHERE id = ?").run(id);
  redirect("/palettes");
}
