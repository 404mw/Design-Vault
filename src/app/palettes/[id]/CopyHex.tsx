"use client";

import { useState } from "react";

/**
 * One full-size swatch: the color itself as background, name/hex/role
 * captioned beneath. Clicking copies the hex to the clipboard and swaps the
 * caption to "Copied" for a moment — no toast library needed.
 */
export function CopyHex({ hex, name, role }: { hex: string; name: string; role: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context);
      // this is a private local tool, so failing silently is fine.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex flex-col border border-line text-left transition-colors hover:border-line-strong"
    >
      <span className="block h-28 w-full" style={{ backgroundColor: hex }} aria-hidden />
      <span className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="font-serif text-sm text-ink">{name}</span>
        <span className="catalog-label text-3xs text-ink-soft">
          {copied ? "Copied" : hex} · {role}
        </span>
      </span>
    </button>
  );
}
