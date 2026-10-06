"use client";

import { Check, Copy } from "lucide-react";
import { useCopy } from "@/lib/useCopy";

/** Small copy icon for browse-card rows; sits above the card's stretched link. */
export function CardCopyButton({ text, label }: { text: string; label: string }) {
  const { copied, copy } = useCopy(1500);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          copy(text);
        }}
        className="relative z-10 -mx-1 -my-1 flex size-6 shrink-0 items-center justify-center rounded-control text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </>
  );
}
