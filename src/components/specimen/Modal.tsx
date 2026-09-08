"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * The shell for every intercepted detail route (`@modal/(.)[id]`). Closing
 * always means "go back to wherever the grid was" — `router.back()` — not a
 * hardcoded route, since the grid can carry search/filter query params the
 * modal shouldn't discard. Backdrop clicks close via an identity check
 * (`e.target === overlay`) so clicks that bubble up from the panel itself
 * never trigger it, and Escape does the same. Direct navigation to a detail
 * URL (a hard refresh, or a link from outside this route) never renders
 * this — Next only mounts it for a client-side transition from the grid.
 */
export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") router.back();
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) router.back();
      }}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-paper-deep/90 px-4 py-8 sm:py-12"
    >
      <div className="relative w-full max-w-3xl border border-line bg-paper">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="catalog-label absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center border border-line bg-paper text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          ×
        </button>
        <div className="max-h-[85vh] overflow-y-auto p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
