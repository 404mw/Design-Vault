"use client";

import { useCopy } from "@/lib/useCopy";

export function CopyButton({ text }: { text: string }) {
  const { copied, copy } = useCopy(1500);

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className="catalog-label text-3xs text-ink-faint hover:text-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
