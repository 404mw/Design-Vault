/** A soft rounded tag chip. */
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
  const className = `inline-flex items-center rounded-full border px-3 py-1 font-sans text-2xs transition-colors ${
    active
      ? "border-accent bg-accent-soft text-accent"
      : "border-transparent bg-paper-deep text-ink-soft hover:border-line-strong hover:text-ink"
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
