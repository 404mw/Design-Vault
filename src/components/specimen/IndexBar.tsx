"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The toolbar atop every browse route: a search field plus fixed-list
 * filter controls and an optional "+ New" button. Landing state is browse-first — this
 * sits above an already-populated plate grid, not an empty page.
 *
 * Search and filters are client-driven: typing debounces into a URL update
 * (triggering the server component's re-render), and filter selects apply
 * immediately. The `<form>` element is kept for layout only — its native
 * submit is suppressed so Enter can't trigger a duplicate navigation on top
 * of the debounced client-side one.
 *
 * Both the search debounce and each filter's `onChange` build their next
 * URL from `window.location.search` read live at the moment they fire,
 * rather than from `useSearchParams()` (which lags a render behind an
 * in-flight `router.replace` on these `force-dynamic` pages). That keeps
 * back-to-back filter/search changes from clobbering each other before a
 * prior navigation's round-trip resolves.
 */
export function IndexBar({
  searchName,
  searchPlaceholder,
  defaultSearch,
  children,
}: {
  searchName: string;
  searchPlaceholder: string;
  defaultSearch?: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(defaultSearch ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set(searchName, value);
      } else {
        params.delete(searchName);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      method="get"
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-wrap items-stretch gap-3"
    >
      <div className="relative min-w-index-search flex-1">
        <label htmlFor={searchName} className="sr-only">
          Search
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-soft"
        />
        <input
          id={searchName}
          name={searchName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-full w-full rounded-control border border-line bg-paper-raised py-3 pl-12 pr-4 font-sans text-sm text-ink shadow-card outline-none placeholder:text-ink-faint focus:border-accent"
        />
      </div>
      {children}
    </form>
  );
}

export function NewButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control bg-accent px-5 py-3 font-sans text-sm font-medium text-paper-raised transition-opacity hover:opacity-90"
    >
      <Plus aria-hidden className="size-4" />
      {children}
    </Link>
  );
}

export function FilterSelect({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="relative flex min-w-32 flex-col rounded-control border border-line bg-paper-raised px-3 py-2 shadow-card focus-within:border-accent">
      <label htmlFor={name} className="catalog-label text-3xs text-ink-faint">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={searchParams.get(name) ?? defaultValue ?? ""}
        onChange={(e) => {
          const params = new URLSearchParams(window.location.search);
          if (e.target.value) {
            params.set(name, e.target.value);
          } else {
            params.delete(name);
          }
          router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        }}
        className="w-full cursor-pointer appearance-none bg-transparent pr-6 font-sans text-sm capitalize text-ink outline-none"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute bottom-2.5 right-3 size-4 text-ink-soft"
      />
    </div>
  );
}
