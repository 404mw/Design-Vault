"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LICENCES } from "@/lib/constants";
import { Field, TextInput, Select, SubmitButton } from "@/components/specimen";
import { FontUploadDropzone } from "./FontUploadDropzone";
import { FontFamilyPicker, type FamilyGroup } from "./FontFamilyPicker";
import { saveFontFamily } from "./actions";

// Mirrors next.config.ts's experimental.serverActions.bodySizeLimit
// ("50mb") — that limit is enforced by the framework outside the
// result-returning error path, so exceeding it produces an opaque error
// instead of a real validation message. Warn before that happens rather
// than after. Each family is its own server-action call, so the limit
// applies per family, not to the whole selection.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function groupBytes(group: FamilyGroup): number {
  return group.files.reduce((sum, f) => sum + f.size, 0);
}

/**
 * Shared by the full-page route and the modal (`id === "new"`) case of
 * `@modal/(.)[id]/page.tsx`. Owns the file candidates gathered by
 * `FontUploadDropzone` and the families/variants ticked in
 * `FontFamilyPicker`, and saves each ticked family as its own sequential
 * `saveFontFamily` call (one save = one family, as the server requires).
 */
export function NewFontForm() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<File[]>([]);
  const [selected, setSelected] = useState<FamilyGroup[]>([]);
  const [savedFiles, setSavedFiles] = useState<ReadonlySet<File>>(new Set());
  const [familyErrors, setFamilyErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Set once every family saved — keeps the form locked until the
  // navigation lands, so a second click can't re-save everything.
  const [done, setDone] = useState(false);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const saving = progress !== null;
  const locked = saving || done;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Closing the modal mid-save keeps the batch running; this covers tab
  // close and reload.
  useEffect(() => {
    if (!saving) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);
  const oversized = selected.filter((g) => groupBytes(g) > MAX_UPLOAD_BYTES);
  const saveable = selected.filter((g) => groupBytes(g) <= MAX_UPLOAD_BYTES);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlightRef.current || done || saveable.length === 0) return;
    inFlightRef.current = true;

    const form = new FormData(e.currentTarget);
    const shared = {
      licence: form.get("licence"),
      foundry: form.get("foundry"),
      source_url: form.get("source_url"),
    };

    setFormError(null);
    setFamilyErrors({});

    const failures: { key: string; name: string; error: string }[] = [];
    const saved: File[] = [];

    for (let i = 0; i < saveable.length; i++) {
      const group = saveable[i];
      if (mountedRef.current) setProgress({ current: i + 1, total: saveable.length });

      const fd = new FormData();
      for (const [name, value] of Object.entries(shared)) {
        if (typeof value === "string") fd.append(name, value);
      }
      for (const file of group.files) fd.append("files", file);

      try {
        const result = await saveFontFamily(fd);
        if (result.ok) saved.push(...group.files);
        else failures.push({ key: group.key, name: group.name, error: result.error });
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        const tooLarge = /body|size|limit|large|exceed/i.test(message);
        failures.push({
          key: group.key,
          name: group.name,
          error: message
            ? `Couldn't save this family: ${message}${tooLarge ? " — it may be over the upload size limit." : ""}`
            : "Couldn't save this family — the request failed. Try again.",
        });
      }
    }

    inFlightRef.current = false;
    // The user closed the form mid-save: the batch finished anyway, but
    // there is nothing left to update or navigate.
    if (!mountedRef.current) return;

    if (failures.length === 0) {
      // Stay locked (progress cleared, done set) until the navigation lands.
      setDone(true);
      setProgress(null);
      // The action already revalidated /fonts. Replace rather than push so
      // history doesn't keep a submitted form: from the modal this swaps the
      // intercepted /fonts/new for /fonts (the @modal slot falls back to its
      // null page, closing the modal over the fresh grid); on the full page
      // it simply lands on the grid.
      router.replace("/fonts");
      return;
    }

    setProgress(null);

    if (saved.length > 0) {
      setSavedFiles((current) => new Set([...current, ...saved]));
    }

    // One identical error across several families is a shared-field problem
    // (e.g. the source URL) — say it once instead of under every family.
    const sameError =
      failures.length > 1 && failures.every((f) => f.error === failures[0].error);
    if (sameError) {
      setFormError(`${failures[0].error} (not saved: ${failures.map((f) => f.name).join(", ")})`);
    } else {
      setFamilyErrors(Object.fromEntries(failures.map((f) => [f.key, f.error])));
    }
  }

  const label = saveable.length > 1 ? `Save ${saveable.length} fonts` : "Save Font";

  return (
    <>
      {formError && (
        <p className="border border-accent bg-paper-raised px-3 py-2 text-sm text-accent">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={locked} className="min-w-0 space-y-5">
          <Field
            label="Font files"
            required
            hint="One font entry is saved per family — every weight/style you have."
          >
            <FontUploadDropzone onCandidatesChange={setCandidates} />
          </Field>

          <FontFamilyPicker
            files={candidates}
            onSelectionChange={setSelected}
            savedFiles={savedFiles}
            errors={familyErrors}
            disabled={locked}
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

          {oversized.length > 0 && (
            <p className="text-xs text-accent">
              Over the 50 MB per-family upload limit, so not saved:{" "}
              {oversized
                .map((g) => `${g.name} (${(groupBytes(g) / (1024 * 1024)).toFixed(1)} MB)`)
                .join(", ")}
              . Untick some of their variants to save them.
            </p>
          )}

          <div className="flex items-center gap-4">
            <SubmitButton disabled={locked || saveable.length === 0}>{label}</SubmitButton>
            {done && (
              <p className="text-xs text-ink-faint" role="status">
                Saved, opening grid…
              </p>
            )}
            {progress && (
              <p className="text-xs text-ink-faint" role="status">
                Saving {progress.current} of {progress.total}…
              </p>
            )}
          </div>
        </fieldset>
      </form>
    </>
  );
}
