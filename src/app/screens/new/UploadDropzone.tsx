"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpecimenPreview = {
  mediaType: "image" | "video";
  /**
   * A src usable for canvas colour extraction without CORS-tainting it:
   * either the local blob:/relative-path preview (same-origin), or a
   * same-origin proxy URL for a dragged remote URL. Null for video.
   */
  extractSrc: string | null;
};

/**
 * Captures a specimen via three free paths: a manual file
 * picker, paste-from-clipboard, and drag-and-drop. A browser-tab drag of an
 * image usually hands over a URL (e.g. an i.pinimg.com CDN link) rather than
 * file bytes — that URL rides along in a hidden `dragged_url` input so the
 * Server Action can fetch it server-side, where CORS doesn't apply.
 */
export function UploadDropzone({
  onUrlCaptured,
  onSpecimenChange,
  existingPreview,
}: {
  onUrlCaptured?: (url: string) => void;
  /** Fired whenever the current preview's media type/extraction src changes, including on mount. */
  onSpecimenChange?: (preview: SpecimenPreview | null) => void;
  /** Edit mode only: the screen's current media, shown by default until replaced. */
  existingPreview?: { url: string; mediaType: "image" | "video" } | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingPreview?.url ?? null);
  const [previewKind, setPreviewKind] = useState<"image" | "video" | null>(
    existingPreview?.mediaType ?? null,
  );
  const [draggedUrl, setDraggedUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onSpecimenChange) return;
    if (!previewUrl || !previewKind) {
      onSpecimenChange(null);
      return;
    }
    if (previewKind === "video") {
      onSpecimenChange({ mediaType: "video", extractSrc: null });
      return;
    }
    // A dragged remote URL would CORS-taint a canvas read directly — proxy
    // it same-origin. A captured file (blob: object URL) or the existing
    // same-origin media path both read fine as-is.
    const extractSrc = draggedUrl
      ? `/api/image-proxy?url=${encodeURIComponent(draggedUrl)}`
      : previewUrl;
    onSpecimenChange({ mediaType: "image", extractSrc });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl, previewKind, draggedUrl]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const showFilePreview = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewKind(file.type.startsWith("video") ? "video" : "image");
    setDraggedUrl("");
  }, []);

  const captureFile = useCallback(
    (file: File) => {
      showFilePreview(file);
      // Sync into the real file input so the surrounding form's FormData
      // picks it up under name="file" on submit.
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInputRef.current.files = dt.files;
      }
    },
    [showFilePreview],
  );

  const captureUrl = useCallback(
    (url: string) => {
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setDraggedUrl(url);
      setPreviewUrl(url);
      setPreviewKind(/\.(mp4|webm|gif)(\?.*)?$/i.test(url) ? "video" : "image");
      onUrlCaptured?.(url);
    },
    [onUrlCaptured],
  );

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.kind === "file" && /^(image|video)\//.test(item.type)) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          captureFile(file);
          return;
        }
      }
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      captureFile(files[0]);
      return;
    }

    const uri =
      e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (uri.trim()) {
      captureUrl(uri.trim());
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) showFilePreview(file);
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragging(false)}
      className={`flex flex-col items-center justify-center gap-3 border border-dashed px-4 py-8 text-center outline-none transition-colors ${
        isDragging ? "border-accent bg-paper-deep" : "border-line"
      }`}
    >
      {previewUrl ? (
        <div className="w-full max-w-sm overflow-hidden border border-line bg-paper-deep">
          {previewKind === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={previewUrl} controls className="w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Captured specimen preview" className="w-full" />
          )}
        </div>
      ) : (
        <p className="catalog-label text-2xs text-ink-faint">
          Paste (Ctrl+V), drag from a tab, or choose a file
        </p>
      )}

      <label className="catalog-label cursor-pointer text-2xs text-ink-soft underline underline-offset-2 hover:text-ink">
        Choose file
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*,video/mp4,video/webm"
          onChange={handleFileInputChange}
          className="sr-only"
        />
      </label>

      <input type="hidden" name="dragged_url" value={draggedUrl} readOnly />
    </div>
  );
}
