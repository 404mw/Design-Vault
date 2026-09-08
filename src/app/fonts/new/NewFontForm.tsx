"use client";

import { useEffect, useRef, useState } from "react";
import { LICENCES } from "@/lib/constants";
import { Field, TextInput, Select, SubmitButton } from "@/components/specimen";
import { FontUploadDropzone } from "./FontUploadDropzone";
import { FontFamilyPicker } from "./FontFamilyPicker";
import { createFont } from "./actions";

// Mirrors next.config.ts's experimental.serverActions.bodySizeLimit
// ("50mb") — that limit is enforced by the framework outside the
// fail()/?error= redirect path, so exceeding it produces an opaque error
// instead of a real validation message. Warn before that happens rather
// than after.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Shared by the full-page route and the modal (`id === "new"`) case of
 * `@modal/(.)[id]/page.tsx`. Owns the file candidates gathered by
 * `FontUploadDropzone` and the family/variant selection made in
 * `FontFamilyPicker`, and mirrors the current selection into a hidden
 * native file input (via `DataTransfer`, the same trick the old
 * single-piece dropzone used) so only the picked files are ever part of
 * the `files` field the server action receives.
 */
export function NewFontForm({ error }: { error?: string }) {
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [candidates, setCandidates] = useState<File[]>([]);
  const [selected, setSelected] = useState<File[]>([]);

  const selectedBytes = selected.reduce((sum, f) => sum + f.size, 0);
  const overLimit = selectedBytes > MAX_UPLOAD_BYTES;

  useEffect(() => {
    if (!filesInputRef.current) return;
    const dt = new DataTransfer();
    for (const f of selected) dt.items.add(f);
    filesInputRef.current.files = dt.files;
  }, [selected]);

  return (
    <>
      {error && (
        <p className="border border-accent bg-paper-raised px-3 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      <form action={createFont} className="space-y-5">
        <Field
          label="Font files"
          required
          hint="One family per upload — every weight/style you have."
        >
          <FontUploadDropzone onCandidatesChange={setCandidates} />
        </Field>

        <FontFamilyPicker files={candidates} onSelectionChange={setSelected} />

        <input
          ref={filesInputRef}
          type="file"
          name="files"
          multiple
          tabIndex={-1}
          aria-hidden="true"
          // Mirrors the picker's selection only (via the effect above) —
          // it must never be independently operable, or a keyboard user
          // tabbing to it could pick their own files straight into
          // `files`, bypassing the picker entirely.
          onClick={(e) => e.preventDefault()}
          className="sr-only"
        />

        <Field
          label="Licence"
          required
          hint={'The field that bites in a year — choose "unknown" if unsure, never leave blank.'}
        >
          <Select name="licence" required defaultValue={LICENCES[0]}>
            {LICENCES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Foundry" hint="Optional.">
          <TextInput type="text" name="foundry" placeholder="e.g. Commercial Type" />
        </Field>

        <Field label="Source" hint="Optional — where you got it.">
          <TextInput type="url" name="source_url" placeholder="https://…" />
        </Field>

        {overLimit && (
          <p className="text-xs text-accent">
            This selection is {(selectedBytes / (1024 * 1024)).toFixed(1)} MB — over the 50 MB
            upload limit. Untick some variants, or split this family into more than one upload.
          </p>
        )}

        <SubmitButton disabled={overLimit}>Save Font</SubmitButton>
      </form>
    </>
  );
}
