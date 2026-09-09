"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; fail silently, this
      // is a convenience, not a required path.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="catalog-label text-3xs text-ink-faint hover:text-ink"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
