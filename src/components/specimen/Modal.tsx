"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";

/**
 * The shell for every intercepted detail route (`@modal/(.)[id]`). Closing
 * always means "go back to wherever the grid was" — `router.back()` — not a
 * hardcoded route, since the grid can carry search/filter query params the
 * modal shouldn't discard. Built on Radix's Dialog primitive, which is
 * always mounted `open`: closing (Escape, backdrop click, or the close
 * button) flips `open` to `false` via `onOpenChange`, which we translate
 * straight into `router.back()`. Radix also owns focus-trap/restore and
 * body-scroll-lock, so none of that is hand-rolled here. Direct navigation
 * to a detail URL (a hard refresh, or a link from outside this route) never
 * renders this — Next only mounts it for a client-side transition from the
 * grid.
 */
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <Dialog.Root
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-paper-deep/90" />
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-8 sm:py-12">
          <Dialog.Content className="relative w-full max-w-3xl border border-line bg-paper">
            <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="catalog-label absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-line bg-paper text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              ×
            </Dialog.Close>
            <div className="max-h-modal overflow-y-auto p-6 sm:p-8">{children}</div>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
