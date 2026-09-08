"use client";

import { useCallback, useEffect, useState } from "react";
import { isAcceptedFontFilename, isFontCollectionFilename } from "@/lib/font-parse";
import { expandArchive, isArchiveFilename } from "@/lib/client-archive";
import { filesFromDataTransferItems, supportsEntryWalk } from "@/lib/client-entries";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** True for a dotfile or macOS resource-fork junk, using the OS picker's folder path when there is one (a dropped-folder walk and an archive expansion already drop these before this ever sees them). */
function isJunkFile(file: File): boolean {
  const relPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
  const segments = relPath ? relPath.split("/") : [file.name];
  return segments.some((s) => s === "__MACOSX" || s.startsWith("."));
}

/**
 * Gathers a font family's variant files from any of: loose multi-selected
 * files, a folder (OS picker via `webkitdirectory`, or a dragged folder
 * walked recursively), or a .rar/.zip/.7z/.tar archive (expanded entirely
 * client-side — see `@/lib/client-archive`). All three converge into one
 * flat candidate list, filtered down to renderable font formats; the
 * family/variant picker (rendered by `NewFontForm`) takes it from there.
 */
export function FontUploadDropzone({
  onCandidatesChange,
}: {
  onCandidatesChange: (files: File[]) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Sync to the parent after `files` actually changes, rather than from
  // inside a `setFiles` updater (which runs during React's render phase —
  // updating a different component's state from there is not allowed and,
  // under StrictMode's double-invoked updaters, would fire twice with two
  // different array identities).
  useEffect(() => {
    onCandidatesChange(files);
  }, [files, onCandidatesChange]);

  const ingest = useCallback(async (raw: File[]) => {
    const hasArchive = raw.some((f) => isArchiveFilename(f.name));
    if (hasArchive) setIsBusy(true);

    const expanded: File[] = [];
    // Collected across this whole batch rather than overwritten as we go —
    // one corrupt archive alongside a good one (or two failures) must not
    // erase each other's message.
    const messages: string[] = [];

    try {
      for (const f of raw) {
        if (isArchiveFilename(f.name)) {
          try {
            expanded.push(...(await expandArchive(f)));
          } catch (err) {
            messages.push(
              `Couldn't open "${f.name}" — ${errorMessage(err, "it may be corrupt, encrypted, or not a supported archive.")}`,
            );
          }
        } else {
          expanded.push(f);
        }
      }
    } finally {
      if (hasArchive) setIsBusy(false);
    }

    const usable: File[] = [];
    let sawCollection = false;
    for (const f of expanded) {
      if (isJunkFile(f)) continue;
      if (isAcceptedFontFilename(f.name)) usable.push(f);
      else if (isFontCollectionFilename(f.name)) sawCollection = true;
    }

    // Every "found nothing usable" outcome gets a message, not just the
    // .ttc-only case — an archive/folder of only non-font junk (or an
    // empty archive) would otherwise look like the drop silently did
    // nothing at all.
    if (usable.length === 0) {
      messages.push(
        sawCollection
          ? "Only font collection (.ttc) files were found — browsers can't render .ttc directly via @font-face. Extract the individual font files first and upload those."
          : "No supported font files were found there — expecting TTF, OTF, WOFF, or WOFF2.",
      );
    }

    setNotice(messages.length > 0 ? messages.join(" ") : null);

    if (usable.length > 0) {
      setFiles((current) => {
        const next = [...current];
        for (const f of usable) {
          if (!next.some((existing) => existing.name === f.name && existing.size === f.size)) {
            next.push(f);
          }
        }
        return next;
      });
    }
  }, []);

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    // The drag data store goes into "protected mode" as soon as this
    // handler yields to the event loop (i.e. after the first `await`) —
    // capture everything usable from `dataTransfer` synchronously, before
    // any `await`, rather than re-reading it later.
    const items = e.dataTransfer.items;
    const canWalkEntries = Boolean(items && supportsEntryWalk(items));
    const fallbackFiles = Array.from(e.dataTransfer.files);

    try {
      if (canWalkEntries) {
        const walked = await filesFromDataTransferItems(items);
        if (walked.length > 0) {
          await ingest(walked);
          return;
        }
      }
      if (fallbackFiles.length > 0) await ingest(fallbackFiles);
    } catch (err) {
      setNotice(errorMessage(err, "Couldn't read what was dropped — try again or use the file picker instead."));
    }
  }

  function handlePicked(fileList: FileList | null) {
    const picked = fileList ? Array.from(fileList) : [];
    if (picked.length === 0) return;
    ingest(picked).catch((err) => {
      setNotice(errorMessage(err, "Couldn't read the selected files — try again."));
    });
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      className={`flex flex-col gap-3 border border-dashed px-4 py-6 transition-colors ${
        isDragging ? "border-accent bg-paper-deep" : "border-line"
      }`}
    >
      {files.length === 0 ? (
        <p className="catalog-label text-center text-2xs text-ink-faint">
          Drag a folder, a .zip/.rar/.7z/.tar archive, or files here
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between gap-3 border border-line bg-paper px-3 py-1.5"
            >
              <span className="truncate font-catalog-mono text-xs text-ink">{f.name}</span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="catalog-number text-3xs">{formatSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="catalog-label text-3xs text-ink-faint hover:text-accent"
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {isBusy && <p className="text-xs text-ink-faint">Expanding archive…</p>}
      {notice && <p className="text-xs text-accent">{notice}</p>}

      <span className="flex flex-wrap gap-4">
        <label className="catalog-label cursor-pointer self-start text-2xs text-ink-soft underline underline-offset-2 hover:text-ink">
          {files.length === 0 ? "Choose files" : "Add more files"}
          <input
            type="file"
            multiple
            accept=".ttf,.otf,.woff,.woff2,.zip,.rar,.7z,.tar"
            onChange={(e) => {
              handlePicked(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>

        <label className="catalog-label cursor-pointer self-start text-2xs text-ink-soft underline underline-offset-2 hover:text-ink">
          Choose a folder
          <input
            ref={(el) => {
              // webkitdirectory has no React prop — set it directly on the
              // element so the OS picker opens in folder-selection mode.
              el?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            multiple
            onChange={(e) => {
              handlePicked(e.target.files);
              e.target.value = "";
            }}
            className="sr-only"
          />
        </label>
      </span>

      <p className="text-xs text-ink-faint">
        TTF, OTF, WOFF, or WOFF2 — drop a folder, a .zip/.rar/.7z/.tar archive, or select files
        directly. Font collections (.ttc) aren&apos;t supported since browsers can&apos;t render
        them; extract the individual font files first.
      </p>
    </div>
  );
}
