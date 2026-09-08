"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The classification index atop every browse route: a search field plus
 * fixed-list filter controls, styled as a catalog's front-of-book index
 * rather than a bolted-on search bar. Landing state is browse-first — this
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
      className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line-strong pb-5"
    >
      <div className="flex min-w-index-search flex-1 flex-col gap-1">
        <label htmlFor={searchName} className="catalog-label text-3xs text-ink-faint">
          Search
        </label>
        <input
          id={searchName}
          name={searchName}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={searchPlaceholder}
          className="border-b border-line bg-transparent py-1 font-serif text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
      </div>
      {children}
    </form>
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
    <div className="flex flex-col gap-1">
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
        className="catalog-label border-b border-line bg-paper py-1 pr-2 text-2xs text-ink outline-none focus:border-accent"
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
