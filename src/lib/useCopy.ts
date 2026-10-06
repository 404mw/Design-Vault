"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Clipboard copy with a transient `copied` flag. Fails silently: the
 * Clipboard API can be unavailable (permissions, non-secure context) and this
 * is a private local tool.
 */
export function useCopy(resetMs: number) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      clearTimeout(timer.current);
      setCopied(true);
      timer.current = setTimeout(() => setCopied(false), resetMs);
    } catch {
      // intentionally silent
    }
  }

  return { copied, copy };
}
