"use client";

import { useEffect, useState } from "react";

function hasFiles(e: DragEvent): boolean {
  return Array.from(e.dataTransfer?.types ?? []).includes("Files");
}

/**
 * True while a file drag is anywhere over the window. Also, for as long as the
 * calling component is mounted, cancels the browser's default for file drags
 * and drops that miss the dropzone (otherwise the browser would open or
 * download the file, navigating away from the form). Text and link drags are
 * never touched, so a dropzone's dragged-URL fallback keeps working.
 *
 * A depth counter keeps the flag from flickering as the drag crosses child
 * elements (each crossing fires a dragleave then a dragenter).
 */
export function useWindowFileDrag(): boolean {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  useEffect(() => {
    let depth = 0;

    const reset = () => {
      depth = 0;
      setIsDraggingFiles(false);
    };
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setIsDraggingFiles(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDraggingFiles(false);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDrop = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
      reset();
    };

    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", reset);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", reset);
    };
  }, []);

  return isDraggingFiles;
}

/**
 * Shared dropzone surface classes: resting target, file-drag-anywhere, and
 * over-the-zone (strongest). While dragging, the zone is lifted (`relative
 * z-50`) above the `DropBackdrop` blur layer, on the opaque `bg-accent-soft` so
 * the blur doesn't show through it.
 */
export function dropzoneToneClass(isDraggingFiles: boolean, isOver: boolean): string {
  if (isOver) return "relative z-50 border-accent bg-accent-soft shadow-card-hover ring-4 ring-accent/50";
  if (isDraggingFiles) return "relative z-50 border-accent bg-accent-soft shadow-card ring-2 ring-accent/30";
  return "border-accent/60 bg-accent-soft";
}
