import type { ReactNode } from "react";

export function PageHeader({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden
        className="size-icon-tile-lg flex shrink-0 items-center justify-center rounded-card bg-accent-soft text-accent"
      >
        {icon}
      </span>
      <div>
        <h1 className="font-sans text-3xl font-bold text-ink">{title}</h1>
        <p className="max-w-page-description mt-1 text-sm text-ink-soft">{description}</p>
      </div>
    </div>
  );
}
