"use client";

/**
 * Renders a SQLite `datetime('now')` timestamp (UTC) as e.g. "Sep 12, 2026" in
 * the viewer's local timezone. The server render uses the server's timezone;
 * the client re-renders with the viewer's, so the text may legitimately differ
 * at hydration.
 */
export function LocalDate({ createdAt }: { createdAt: string }) {
  const d = new Date(`${createdAt.replace(" ", "T")}Z`);
  const text = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return <span suppressHydrationWarning>{text}</span>;
}
