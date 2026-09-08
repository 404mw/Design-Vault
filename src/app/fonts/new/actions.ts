"use server";

import { redirect } from "next/navigation";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { saveUpload } from "@/lib/uploads";
import {
  parseFontFile,
  isAcceptedFontFilename,
  isFontCollectionFilename,
} from "@/lib/font-parse";
import { LICENCES, type Licence } from "@/lib/constants";

function fail(message: string): never {
  redirect("/fonts/new?error=" + encodeURIComponent(message));
}

export async function createFont(formData: FormData) {
  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const licenceRaw = formData.get("licence");
  const foundryRaw = formData.get("foundry");
  const sourceRaw = formData.get("source_url");

  if (files.length === 0) {
    fail("Choose at least one font file — every variant of the family, if you have them.");
  }

  // The client-side dropzone/picker already filters to renderable formats —
  // this is the trust boundary, not a convenience duplicate of it. A .ttc
  // parses fine but browsers can't render it via @font-face, so it's
  // rejected here regardless of how it arrived.
  const rejected = files.filter((f) => !isAcceptedFontFilename(f.name));
  if (rejected.length > 0) {
    if (rejected.some((f) => isFontCollectionFilename(f.name))) {
      fail(
        "Font collections (.ttc) aren't supported — browsers can't render them via @font-face. Extract the individual font files first and upload those.",
      );
    }
    fail(
      `These aren't supported font files: ${rejected.map((f) => f.name).join(", ")} — use TTF, OTF, WOFF, or WOFF2.`,
    );
  }

  const licence = typeof licenceRaw === "string" ? licenceRaw : "";
  if (!LICENCES.includes(licence as Licence)) {
    fail("Choose a licence.");
  }

  const parsedFiles: { file: File; familyName: string; weightLabel: string }[] = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const parsed = await parseFontFile(buffer);
      parsedFiles.push({ file, ...parsed });
    } catch {
      fail(`Couldn't read "${file.name}" — try a different file.`);
    }
  }

  const distinctFamilies = new Set(parsedFiles.map((p) => p.familyName.trim().toLowerCase()));
  if (distinctFamilies.size > 1) {
    fail(
      `These files belong to different families (${[...new Set(parsedFiles.map((p) => p.familyName))].join(", ")}) — upload one family at a time.`,
    );
  }

  const familyName = parsedFiles[0].familyName;

  const foundry =
    typeof foundryRaw === "string" && foundryRaw.trim() ? foundryRaw.trim() : null;
  const sourceUrl =
    typeof sourceRaw === "string" && sourceRaw.trim() ? sourceRaw.trim() : null;

  // Files land on disk before the DB row exists, and there's no single
  // atomic step across "write N files" + "insert N+1 rows" — so on any
  // failure anywhere in here, unlink whatever was already written rather
  // than leaving orphaned binaries under public/uploads/fonts/. That's the
  // same guarantee documented for delete: no file survives without a
  // matching row, in either direction.
  const saved: { filePath: string; weightLabel: string }[] = [];
  try {
    for (const { file, weightLabel } of parsedFiles) {
      const filePath = await saveUpload(file, "fonts");
      saved.push({ filePath, weightLabel });
    }

    const primary = saved[0];

    db.exec("BEGIN");
    try {
      const result = db
        .prepare(
          `INSERT INTO fonts (family_name, weights, file_path, foundry, source_url, licence)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(familyName, primary.weightLabel, primary.filePath, foundry, sourceUrl, licence);

      const fontId = result.lastInsertRowid;
      const insertVariant = db.prepare(
        `INSERT INTO font_files (font_id, file_path, weight_label, position) VALUES (?, ?, ?, ?)`,
      );
      saved.slice(1).forEach((variant, i) => {
        insertVariant.run(fontId, variant.filePath, variant.weightLabel, i);
      });
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  } catch {
    await Promise.all(
      saved.map(({ filePath }) =>
        fs.rm(path.join(process.cwd(), "public", filePath), { force: true }).catch(() => {}),
      ),
    );
    fail("Couldn't save this font — something went wrong writing the files or the database record. Try again.");
  }

  redirect("/fonts");
}
