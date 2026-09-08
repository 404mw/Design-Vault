import type { CSSProperties, ReactNode } from "react";

/**
 * Renders children set in the actual uploaded font via a per-item @font-face
 * declaration. The CSS family name is namespaced to the row id so multiple
 * font plates on the same page (the browse grid) never collide with each
 * other's declarations.
 */
export function FontFace({
  id,
  filePath,
  className,
  style,
  children,
}: {
  id: number | string;
  filePath: string;
  familyName?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const cssFamily = `specimen-${id}`;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@font-face { font-family: "${cssFamily}"; src: url("${filePath}"); font-display: swap; }`,
        }}
      />
      <span style={{ fontFamily: `"${cssFamily}"`, ...style }} className={className}>
        {children}
      </span>
    </>
  );
}
