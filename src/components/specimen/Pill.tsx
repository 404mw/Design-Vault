/**
 * A tag chip. Square corners, hairline border, tracked caps — the same
 * rectangle-and-hairline vocabulary as every other control in this system,
 * per the Shapes rule (the verdict stamp is the build's one circular
 * exception, tags are not a second one).
 */
export function Pill({
  children,
  active = false,
  as: Tag = "span",
  ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
} & (
  | ({ as?: "span" } & React.HTMLAttributes<HTMLSpanElement>)
  | ({ as: "button" } & React.ButtonHTMLAttributes<HTMLButtonElement>)
)) {
  const className = `catalog-label inline-flex items-center border px-2 py-0.5 text-3xs transition-colors ${
    active
      ? "border-accent text-accent"
      : "border-line text-ink-soft hover:border-line-strong hover:text-ink"
  }`;

  if (Tag === "button") {
    return (
      <button type="button" className={className} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }

  return (
    <span className={className} {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>
      {children}
    </span>
  );
}
