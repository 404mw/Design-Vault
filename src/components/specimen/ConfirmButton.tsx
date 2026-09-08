"use client";

import type { ReactNode } from "react";

/** A submit button that requires confirmation first — used for delete actions, where the library's curation must survive a misclick. */
export function ConfirmButton({
  confirmMessage,
  className,
  children,
}: {
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
