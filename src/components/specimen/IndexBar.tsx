import type { ReactNode } from "react";

/**
 * The classification index atop every browse route: a search field plus
 * fixed-list filter controls, styled as a catalog's front-of-book index
 * rather than a bolted-on search bar. Landing state is browse-first — this
 * sits above an already-populated plate grid, not an empty page.
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
  return (
    <form
      method="get"
      className="flex flex-wrap items-end gap-x-6 gap-y-3 border-b border-line-strong pb-5"
    >
      <div className="flex min-w-[220px] flex-1 flex-col gap-1">
        <label htmlFor={searchName} className="catalog-label text-3xs text-ink-faint">
          Search
        </label>
        <input
          id={searchName}
          name={searchName}
          defaultValue={defaultSearch}
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
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="catalog-label text-3xs text-ink-faint">
        {label}
      </label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="catalog-label border-b border-line bg-transparent py-1 pr-2 text-2xs text-ink outline-none focus:border-accent"
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
