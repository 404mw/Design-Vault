import type { Verdict } from "@/lib/constants";

/**
 * Verdict is read by shape, not color: a circular ring = love (a cataloguer's "keep" mark), a struck
 * diagonal = hate (a rejected specimen). Never render this as a red/green
 * heart icon.
 */
export function VerdictStamp({
  verdict,
  size = "md",
}: {
  verdict: Verdict;
  size?: "sm" | "md";
}) {
  const dimClass = size === "sm" ? "size-stamp-sm" : "size-stamp-md";

  if (verdict === "love") {
    return (
      <span
        className={`stamp-ring catalog-label ${dimClass} inline-flex shrink-0 items-center justify-center rounded-full text-3xs`}
        title="Loved"
        aria-label="Verdict: loved"
      >
        KEEP
      </span>
    );
  }

  return (
    <span
      className={`stamp-void ${dimClass} relative inline-flex shrink-0 items-center justify-center rounded-full border border-ink-faint`}
      title="Hated"
      aria-label="Verdict: hated"
    >
      <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full" aria-hidden>
        <line x1="8" y1="8" x2="28" y2="28" stroke="currentColor" />
        <line x1="28" y1="8" x2="8" y2="28" stroke="currentColor" />
      </svg>
    </span>
  );
}
