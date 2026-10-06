"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/screens", label: "Screens", sub: "Gallery" },
  { href: "/palettes", label: "Palettes", sub: "Colors" },
  { href: "/fonts", label: "Fonts", sub: "Type" },
  { href: "/components", label: "Components", sub: "UI Kit" },
] as const;

export function CatalogNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 px-4 sm:px-6">
        <Link href="/screens" className="flex items-center gap-4 py-3 sm:py-4">
          <span className="text-lg font-semibold text-ink sm:text-xl">Design Vault</span>
          <span className="catalog-label hidden border-l border-line-strong pl-4 text-2xs text-ink-faint sm:inline">
            UI Screens &amp; Assets
          </span>
        </Link>

        <nav className="flex min-w-0 items-stretch sm:gap-2">
          {SECTIONS.map((s) => {
            const active = pathname?.startsWith(s.href);
            return (
              <Link
                key={s.href}
                href={s.href}
                className={`flex flex-col items-center justify-center border-b-nav-active px-1.5 py-3 sm:px-4 sm:py-4 ${
                  active
                    ? "border-accent text-accent"
                    : "border-transparent text-ink hover:text-accent"
                }`}
              >
                <span className="catalog-label text-3xs font-semibold tracking-wide sm:text-2xs sm:tracking-widest">{s.label}</span>
                <span className="catalog-label text-3xs font-normal text-ink-faint">{s.sub}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
