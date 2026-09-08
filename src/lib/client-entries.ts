"use client";

/**
 * Recursively resolves dragged `DataTransferItem`s into a flat `File[]`,
 * walking into folders via `webkitGetAsEntry()` — the only way a browser
 * lets a drag-and-drop target see a dropped folder's contents at all (an
 * `<input type="file">`, even with `webkitdirectory`, only ever produces a
 * flat `FileList`, never nested entries).
 */

function isJunkName(name: string): boolean {
  return name === "__MACOSX" || name.startsWith(".");
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (isJunkName(entry.name)) return;

  if (entry.isFile) {
    out.push(await readFileEntry(entry as FileSystemFileEntry));
    return;
  }

  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries only returns a batch at a time — keep calling until it
    // returns empty, per the File and Directory Entries API.
    let batch: FileSystemEntry[];
    do {
      batch = await readDirectoryBatch(reader);
      for (const child of batch) await walkEntry(child, out);
    } while (batch.length > 0);
  }
}

export function supportsEntryWalk(items: DataTransferItemList): boolean {
  return items.length > 0 && typeof items[0]?.webkitGetAsEntry === "function";
}

export async function filesFromDataTransferItems(items: DataTransferItemList): Promise<File[]> {
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }

  const out: File[] = [];
  for (const entry of entries) await walkEntry(entry, out);
  return out;
}
