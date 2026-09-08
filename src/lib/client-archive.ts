"use client";

import { Archive } from "libarchive.js";

/**
 * Expands .rar/.zip/.7z/.tar archives entirely in the browser via
 * libarchive.js (libarchive compiled to WASM, worker-based). This is
 * deliberate and load-bearing: the server action never receives an
 * archive, so there's no staging directory, no temp files, no cleanup
 * pass, and no orphaned-file risk. Do not add a server-side fallback.
 *
 * The worker bundle and its WASM binary are pre-built static assets copied
 * from `libarchive.js/dist` into `public/libarchive/` (see that folder) —
 * `Archive.init()` points at that public path so the browser fetches them
 * directly rather than needing them bundled. The WASM itself is only
 * downloaded lazily, the first time an archive is actually opened.
 *
 * `libarchive.js` in `package.json` is pinned to an exact version, not a
 * range — an `npm update` would bump the main-thread half of the library
 * while these hand-copied `public/libarchive/` files stay on the old
 * protocol, and a version mismatch there manifests as exactly the
 * never-settling hang `verifyAssetsReachable`/`withTimeout` below exist to
 * catch. Bumping the version means re-copying `dist/worker-bundle.js` and
 * `dist/libarchive.wasm` in the same change.
 */
const WORKER_URL = "/libarchive/worker-bundle.js";
const WASM_URL = "/libarchive/libarchive.wasm";
const OPEN_TIMEOUT_MS = 20_000;

let initialized = false;
let assetsVerified = false;

function initOnce() {
  if (initialized || typeof window === "undefined") return;
  Archive.init({ workerUrl: WORKER_URL });
  initialized = true;
}

/**
 * libarchive.js constructs its worker with a bare `new Worker(...)` and
 * nothing anywhere listens for its `error` event — if the worker script or
 * its WASM binary 404s (a basePath deployment, a stale cache, a missing
 * `public/libarchive/` copy) the Comlink call inside `Archive.open()`
 * never resolves *or* rejects. A plain `fetch` HEAD against both files
 * fails fast and visibly instead of hanging the dropzone on "Expanding
 * archive…" forever.
 */
async function verifyAssetsReachable(): Promise<void> {
  if (assetsVerified) return;
  await Promise.all(
    [WORKER_URL, WASM_URL].map(async (url) => {
      let res: Response;
      try {
        res = await fetch(url, { method: "HEAD" });
      } catch {
        throw new Error(`Couldn't reach ${url}.`);
      }
      if (!res.ok) throw new Error(`${url} responded ${res.status}.`);
    }),
  );
  assetsVerified = true;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      },
    );
  });
}

const ARCHIVE_EXTENSIONS = /\.(rar|zip|7z|tar)$/i;

export function isArchiveFilename(name: string): boolean {
  return ARCHIVE_EXTENSIONS.test(name);
}

/** macOS resource-fork junk and dotfiles are normal archive contents, not errors — skip them while flattening rather than surfacing them as candidates. */
function isJunkSegment(segment: string): boolean {
  return segment === "__MACOSX" || segment.startsWith(".");
}

function flattenArchiveTree(node: Record<string, unknown>, out: File[] = []): File[] {
  for (const [key, value] of Object.entries(node)) {
    if (isJunkSegment(key)) continue;
    if (value instanceof File) {
      out.push(value);
    } else if (value && typeof value === "object") {
      flattenArchiveTree(value as Record<string, unknown>, out);
    }
  }
  return out;
}

/**
 * Opens and fully extracts an archive, returning a flat list of the files
 * it contains (folders collapsed, junk entries dropped). Rejects — never
 * hangs — if the worker/WASM assets are unreachable or the archive reader
 * doesn't respond within `OPEN_TIMEOUT_MS`.
 */
export async function expandArchive(file: File): Promise<File[]> {
  await verifyAssetsReachable();
  initOnce();

  const archive = await withTimeout(
    Archive.open(file),
    OPEN_TIMEOUT_MS,
    "The archive reader didn't respond — its worker may have failed to load.",
  );
  try {
    const tree = await withTimeout(
      archive.extractFiles(),
      OPEN_TIMEOUT_MS,
      "Extracting the archive timed out.",
    );
    return flattenArchiveTree(tree as Record<string, unknown>);
  } finally {
    // Archive.open() spawns a fresh worker per call — close() terminates
    // it, otherwise every archive opened leaks a worker + WASM heap for
    // the page's lifetime.
    await archive.close().catch(() => {});
  }
}
