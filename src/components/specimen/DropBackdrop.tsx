/**
 * Full-screen blur behind a dropzone while a file drag is over the window, so
 * the only sharp thing on screen is the place to drop. Render it as a sibling
 * of the dropzone (same stacking context, which matters inside the modal) and
 * give the dropzone `dropzoneToneClass`, which lifts it above this layer while
 * dragging. Pointer-transparent: drags and drops pass straight through.
 */
export function DropBackdrop({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 bg-paper/40 backdrop-blur-sm"
    />
  );
}
