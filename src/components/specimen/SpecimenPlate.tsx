import Link from "next/link";
import type { ReactNode } from "react";
import { VerdictStamp } from "./VerdictStamp";
import { Pill } from "./Pill";
import type { Verdict } from "@/lib/constants";

/**
 * The core unit of the whole app: every saved screen, palette, and font
 * renders as a plate — a sample on top, a small tracked caption block below,
 * in the manner of a type foundry's specimen catalog. No plate number and no
 * typed name appear on the card itself (both removed per direct request) —
 * cards are identified by sample, specs, and tags alone. The verdict, where
 * it exists, is stamped directly onto the media as a corner mark instead of
 * living in a now-deleted header strip.
 */
export function SpecimenPlate({
  href,
  sample,
  title,
  specs,
  tags,
  verdict,
  aspectClassName = "aspect-media",
  plateBorderClassName = "border-line",
}: {
  href: string;
  sample: ReactNode;
  title?: string;
  specs?: string[];
  tags?: string[];
  verdict?: Verdict;
  aspectClassName?: string;
  plateBorderClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={`group block border ${plateBorderClassName} bg-paper-raised transition-colors hover:border-line-strong`}
    >
      <div className={`relative overflow-hidden bg-paper-deep ${aspectClassName}`}>
        {sample}
        {verdict && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-paper-deep p-0.5">
            <VerdictStamp verdict={verdict} size="sm" />
          </span>
        )}
      </div>

      <div className="space-y-1.5 px-3 py-2.5">
        {title && <p className="truncate font-serif text-sm text-ink">{title}</p>}
        {specs && specs.length > 0 && (
          <p className="catalog-label truncate text-3xs text-ink-soft">
            {specs.join(" · ")}
          </p>
        )}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {tags.slice(0, 3).map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
            {tags.length > 3 && (
              <span className="catalog-label self-center text-3xs text-ink-faint">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

export function PlateGrid({
  children,
  columns = "default",
}: {
  children: ReactNode;
  columns?: "default" | "wide";
}) {
  return (
    <div
      className={`grid ${
        columns === "wide"
          ? "gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      }`}
    >
      {children}
    </div>
  );
}

export function EmptyPlate({ children }: { children: ReactNode }) {
  return (
    <div className="col-span-full border border-dashed border-line py-16 text-center">
      <p className="catalog-label text-xs text-ink-faint">{children}</p>
    </div>
  );
}
