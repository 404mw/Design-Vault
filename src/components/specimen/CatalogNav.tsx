"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VOLUMES = [
  { href: "/screens", label: "Screens", code: "VOL. I" },
  { href: "/palettes", label: "Palettes", code: "VOL. II" },
  { href: "/fonts", label: "Fonts", code: "VOL. III" },
  { href: "/components", label: "Components", code: "VOL. IV" },
] as const;

export function CatalogNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-6xl items-baseline justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="font-display text-lg text-ink sm:text-xl">Design Vault</span>
          <span className="catalog-label hidden text-2xs text-ink-faint sm:inline">
            A Specimen Catalog
          </span>
        </Link>

        <nav className="flex items-baseline gap-0.5 sm:gap-1">
          {VOLUMES.map((v) => {
            const active = pathname?.startsWith(v.href);
            return (
              <Link
                key={v.href}
                href={v.href}
                className={`group flex flex-col items-center px-2 py-1 sm:px-4 ${
                  active ? "text-ink" : "text-ink-soft hover:text-ink"
                }`}
              >
                <span className="catalog-number hidden text-3xs text-ink-faint sm:inline">
                  {v.code}
                </span>
                <span
                  className={`catalog-label text-2xs sm:text-xs ${
                    active ? "border-b-nav-active border-accent" : ""
                  }`}
                >
                  {v.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
