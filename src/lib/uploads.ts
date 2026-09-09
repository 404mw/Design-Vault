import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

/** Saves a File/Blob under public/uploads/<subdir>/ and returns its public URL path. */
export async function saveUpload(
  file: File,
  subdir: "screens" | "fonts" | "components",
): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const filename = `${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, filename), buffer);

  return `/uploads/${subdir}/${filename}`;
}

export function mediaTypeFromFilename(filename: string): "image" | "video" {
  const videoExts = [".mp4", ".webm", ".gif"];
  return videoExts.includes(path.extname(filename).toLowerCase()) ? "video" : "image";
}

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

/**
 * Fetches a URL server-side (no CORS restriction here, unlike a client-side
 * fetch) and writes the bytes under public/uploads/<subdir>/ — used when a
 * browser-tab drag only handed us an image URL (e.g. a Pinterest CDN link)
 * rather than real file bytes.
 */
export async function saveUploadFromUrl(
  url: string,
  subdir: "screens" | "fonts" | "components",
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  const buffer = Buffer.from(await res.arrayBuffer());

  const dir = path.join(UPLOAD_ROOT, subdir);
  await fs.mkdir(dir, { recursive: true });

  let ext = EXT_BY_CONTENT_TYPE[contentType];
  if (!ext) {
    try {
      ext = path.extname(new URL(url).pathname) || ".jpg";
    } catch {
      ext = ".jpg";
    }
  }

  const filename = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(dir, filename), buffer);

  return `/uploads/${subdir}/${filename}`;
}
