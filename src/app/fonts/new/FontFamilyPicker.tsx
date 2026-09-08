"use client";

import { useEffect, useState } from "react";
import { parseFontFile } from "@/lib/font-parse";

type ParsedCandidate = {
  file: File;
  familyName: string;
  weightLabel: string;
};

type Family = {
  name: string;
  variants: ParsedCandidate[];
};

/**
 * Groups the dropzone's candidate files by parsed family name and lets the
 * user pick exactly one family (and untick individual variants within it)
 * before it's ever submitted. Parses with fontkit — the same library
 * `parseFontFile` already uses server-side — so this preview matches
 * exactly what `createFont` will save; there's no second parser to keep in
 * sync. The server still re-parses and re-validates every file itself,
 * this is preview only.
 */
export function FontFamilyPicker({
  files,
  onSelectionChange,
}: {
  files: File[];
  onSelectionChange: (files: File[]) => void;
}) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [selectedFamily, setSelectedFamily] = useState<string | null>(null);
  const [uncheckedVariants, setUncheckedVariants] = useState<Set<File>>(new Set());
  const [isParsing, setIsParsing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsParsing(files.length > 0);

      const parsed: ParsedCandidate[] = [];
      const failedNames: string[] = [];

      for (const file of files) {
        // A newer effect run (files changed again mid-parse) has already
        // superseded this one — stop paying for an abandoned run instead
        // of parsing every remaining file first.
        if (cancelled) return;
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (cancelled) return;
          const { familyName, weightLabel } = await parseFontFile(bytes as unknown as Buffer);
          parsed.push({ file, familyName, weightLabel });
        } catch {
          failedNames.push(file.name);
        }
      }
      if (cancelled) return;

      const byFamily = new Map<string, ParsedCandidate[]>();
      for (const p of parsed) {
        const key = p.familyName.trim().toLowerCase();
        if (!byFamily.has(key)) byFamily.set(key, []);
        byFamily.get(key)!.push(p);
      }
      const nextFamilies = [...byFamily.values()].map((variants) => ({
        name: variants[0].familyName,
        variants,
      }));

      setFamilies(nextFamilies);
      setUnreadable(failedNames);
      setSelectedFamily((current) =>
        current && nextFamilies.some((f) => f.name === current)
          ? current
          : (nextFamilies[0]?.name ?? null),
      );
      setUncheckedVariants(new Set());
      setIsParsing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  const activeFamily = families.find((f) => f.name === selectedFamily) ?? null;

  useEffect(() => {
    if (!activeFamily) {
      onSelectionChange([]);
      return;
    }
    onSelectionChange(
      activeFamily.variants.filter((v) => !uncheckedVariants.has(v.file)).map((v) => v.file),
    );
  }, [activeFamily, uncheckedVariants, onSelectionChange]);

  function toggleVariant(file: File) {
    setUncheckedVariants((current) => {
      const next = new Set(current);
      if (next.has(file)) next.delete(file);
      else next.add(file);
      return next;
    });
  }

  if (isParsing) {
    return <p className="text-xs text-ink-faint">Reading font files…</p>;
  }

  if (families.length === 0 && unreadable.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 border border-line bg-paper px-4 py-4">
      {families.length > 0 && (
        <>
          <p className="catalog-label text-2xs text-ink-soft">
            {families.length > 1 ? "Choose one family to save" : "Detected family"}
          </p>

          <div className="flex flex-col gap-2">
            {families.map((family) => (
              <label
                key={family.name}
                className="flex cursor-pointer items-center justify-between gap-3 border border-line px-3 py-2 has-[:checked]:border-accent"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="font-family-picker"
                    checked={family.name === selectedFamily}
                    onChange={() => setSelectedFamily(family.name)}
                    className="sr-only"
                  />
                  <FamilyPreview family={family} />
                </span>
                <span className="catalog-number text-3xs">
                  {family.variants.length} variant{family.variants.length === 1 ? "" : "s"}
                </span>
              </label>
            ))}
          </div>

          {activeFamily && activeFamily.variants.length > 1 && (
            <div className="flex flex-col gap-1.5 border-t border-line pt-3">
              <p className="catalog-label text-3xs text-ink-faint">Variants</p>
              {activeFamily.variants.map((variant, i) => (
                <label
                  key={`${variant.file.name}-${variant.file.size}-${i}`}
                  className="flex items-center gap-2 text-xs text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={!uncheckedVariants.has(variant.file)}
                    onChange={() => toggleVariant(variant.file)}
                    className="accent-accent"
                  />
                  <span className="truncate font-catalog-mono text-ink">{variant.file.name}</span>
                  <span className="text-ink-faint">— {variant.weightLabel}</span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {unreadable.length > 0 && (
        <p className="text-xs text-accent">
          Couldn&apos;t read: {unreadable.join(", ")} — these won&apos;t be uploaded.
        </p>
      )}
    </div>
  );
}

/** Renders a family's name set in its own typeface, loaded from an object URL via the FontFace API and revoked once no longer needed. */
function FamilyPreview({ family }: { family: Family }) {
  const [cssName] = useState(
    () => `font-picker-${Math.random().toString(36).slice(2)}`,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const objectUrl = URL.createObjectURL(family.variants[0].file);
    const fontFace = new FontFace(cssName, `url(${objectUrl})`);

    fontFace
      .load()
      .then((loaded) => {
        if (cancelled) return;
        document.fonts.add(loaded);
        setReady(true);
      })
      .catch(() => {
        // Preview only — fall back to the system font silently.
      });

    return () => {
      cancelled = true;
      // Reset before the next family's font swaps in under the same
      // instance so a stale @font-face never briefly shows through.
      setReady(false);
      document.fonts.delete(fontFace);
      URL.revokeObjectURL(objectUrl);
    };
  }, [family, cssName]);

  return (
    <span style={ready ? { fontFamily: `"${cssName}"` } : undefined} className="text-sm text-ink">
      {family.name}
    </span>
  );
}
