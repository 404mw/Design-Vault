import { ArrowUpRight } from "lucide-react";

/** Small external-link icon for browse-card rows; sits above the card's stretched link. */
export function CardLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="relative z-10 -mx-1 -my-1 flex size-6 shrink-0 items-center justify-center rounded-control text-ink-faint hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowUpRight aria-hidden className="size-3.5" />
    </a>
  );
}
