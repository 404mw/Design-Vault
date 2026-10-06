import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import type { ReactNode } from "react";
import { VerdictStamp } from "./VerdictStamp";
import { Pill } from "./Pill";
import { LocalDate } from "./LocalDate";
import type { Verdict } from "@/lib/constants";

/**
 * The core unit of the app: every saved screen, palette, font, and component
 * renders as a card — an inset sample on top, then icon tile + title +
 * description, tag pills, and a date / "View details" footer. The whole card
 * is one stretched link overlay; interactive children use `relative z-10`. The verdict, where it exists, sits on the media corner.
 */
export function SpecimenPlate({
  href,
  sample,
  icon,
  title,
  description,
  specs,
  tags,
  verdict,
  createdAt,
  linkLabel,
  children,
}: {
  href: string;
  sample: ReactNode;
  icon: ReactNode;
  title?: string;
  description?: string;
  specs?: string[];
  tags?: string[];
  verdict?: Verdict;
  createdAt?: string;
  /** Accessible name of the card link. Defaults to title, description and specs joined. */
  linkLabel?: string;
  /** Optional content rendered between the heading and the tags. Interactive
   *  elements in here must be `relative z-10` to sit above the link overlay. */
  children?: ReactNode;
}) {
  const label =
    linkLabel ||
    [title, description, ...(specs ?? [])].filter(Boolean).join(" — ") ||
    "View details";
  const hasHeading = Boolean(title || description || (specs && specs.length > 0));

  return (
    <article className="group relative mb-6 block break-inside-avoid rounded-card border border-line bg-paper-raised p-3 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="relative overflow-hidden rounded-sample bg-paper-deep">
        {sample}
        {verdict && (
          <span className="absolute right-2 top-2 rounded-full bg-paper-raised p-0.5 shadow-card">
            <VerdictStamp verdict={verdict} size="sm" />
          </span>
        )}
      </div>

      <div className="space-y-3 px-1 pb-1 pt-4">
        {hasHeading && (
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="size-icon-tile flex shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent"
            >
              {icon}
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              {title && <p className="truncate text-sm font-semibold text-ink">{title}</p>}
              {description && (
                <p className="line-clamp-2 text-sm text-ink-soft">{description}</p>
              )}
              {specs && specs.length > 0 && (
                <p className="catalog-label truncate text-3xs text-ink-soft">
                  {specs.join(" · ")}
                </p>
              )}
            </div>
          </div>
        )}
        {children}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
            {tags.length > 3 && (
              <span className="self-center text-2xs text-ink-faint">+{tags.length - 3}</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="flex items-center gap-1.5 text-ink-faint">
            {createdAt && (
              <>
                <Calendar aria-hidden className="size-4" />
                <LocalDate createdAt={createdAt} />
              </>
            )}
          </span>
          <span className="flex items-center gap-1 font-medium text-accent">
            View details
            <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
      {/* Stretched link: last in DOM and positioned, so it paints over the
          card content. Interactive children raise themselves with
          `relative z-10` to sit above it. */}
      <Link
        href={href}
        aria-label={label}
        className="absolute inset-0 rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      />
    </article>
  );
}

/** Masonry: CSS multi-column, 1 / 2 / 3 columns. Cards avoid column breaks. */
export function PlateGrid({ children }: { children: ReactNode }) {
  return <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">{children}</div>;
}

export function EmptyPlate({ children }: { children: ReactNode }) {
  return (
    <div className="column-span-all rounded-card border border-dashed border-line-strong py-16 text-center">
      <p className="catalog-label text-xs text-ink-faint">{children}</p>
    </div>
  );
}
