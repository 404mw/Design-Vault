"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { parseFontFile } from "@/lib/font-parse";

type ParsedCandidate = {
  file: File;
  familyName: string;
  weightLabel: string;
};

type Family = {
  key: string;
  name: string;
  variants: ParsedCandidate[];
};

/** One ticked family's selected files, as handed to the form for saving. */
export type FamilyGroup = { key: string; name: string; files: File[] };

/**
 * Groups the dropzone's candidate files by parsed family name and lets the
 * user tick which families to save (all ticked by default) and untick
 * individual variants within each, before anything is submitted. Parses with
 * fontkit — the same library `parseFontFile` already uses server-side — so
 * this preview matches exactly what `saveFontFamily` will save; there's no
 * second parser to keep in sync. The server still re-parses and re-validates
 * every file itself, this is preview only.
 */
export function FontFamilyPicker({
  files,
  onSelectionChange,
  savedFiles,
  errors,
  disabled,
}: {
  files: File[];
  onSelectionChange: (groups: FamilyGroup[]) => void;
  /** Files already saved this session — hidden, never re-submitted. A saved family reappears if new files for it are added. */
  savedFiles: ReadonlySet<File>;
  /** Per-family save errors, by family key. */
  errors: Readonly<Record<string, string>>;
  disabled?: boolean;
}) {
  const [parsedFamilies, setFamilies] = useState<Family[]>([]);
  const [unreadable, setUnreadable] = useState<string[]>([]);
  const [uncheckedFamilies, setUncheckedFamilies] = useState<Set<string>>(new Set());
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
      const nextFamilies = [...byFamily.entries()].map(([key, variants]) => ({
        key,
        name: variants[0].familyName,
        variants,
      }));

      setFamilies(nextFamilies);
      setUnreadable(failedNames);
      // Keep the user's unticks for families/variants that still exist;
      // anything newly detected defaults to ticked.
      const liveKeys = new Set(nextFamilies.map((f) => f.key));
      const liveFiles = new Set(nextFamilies.flatMap((f) => f.variants.map((v) => v.file)));
      setUncheckedFamilies((current) => new Set([...current].filter((k) => liveKeys.has(k))));
      setUncheckedVariants((current) => new Set([...current].filter((f) => liveFiles.has(f))));
      setIsParsing(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  const families = useMemo(
    () =>
      parsedFamilies
        .map((f) => ({ ...f, variants: f.variants.filter((v) => !savedFiles.has(v.file)) }))
        .filter((f) => f.variants.length > 0),
    [parsedFamilies, savedFiles],
  );

  const tickedVariants = useCallback(
    (family: Family) => family.variants.filter((v) => !uncheckedVariants.has(v.file)),
    [uncheckedVariants],
  );

  // A family with every variant unticked counts as unticked.
  const isFamilyTicked = useCallback(
    (family: Family) => !uncheckedFamilies.has(family.key) && tickedVariants(family).length > 0,
    [uncheckedFamilies, tickedVariants],
  );

  useEffect(() => {
    onSelectionChange(
      families
        .filter(isFamilyTicked)
        .map((f) => ({ key: f.key, name: f.name, files: tickedVariants(f).map((v) => v.file) })),
    );
  }, [families, isFamilyTicked, tickedVariants, onSelectionChange]);

  function toggleFamily(family: Family) {
    if (isFamilyTicked(family)) {
      setUncheckedFamilies((current) => new Set(current).add(family.key));
      return;
    }
    // Re-ticking a family whose variants were all unticked brings them back.
    setUncheckedFamilies((current) => {
      const next = new Set(current);
      next.delete(family.key);
      return next;
    });
    setUncheckedVariants((current) => {
      const next = new Set(current);
      for (const v of family.variants) next.delete(v.file);
      return next;
    });
  }

  function toggleVariant(file: File, family: Family) {
    // Ticking a variant of an unticked family re-ticks the family, so the
    // checkbox state always matches what will actually be saved.
    if (uncheckedVariants.has(file) && uncheckedFamilies.has(family.key)) {
      setUncheckedFamilies((current) => {
        const next = new Set(current);
        next.delete(family.key);
        return next;
      });
    }
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
            {families.length > 1 ? "Choose the families to save" : "Detected family"}
          </p>

          <div className="flex flex-col gap-2">
            {families.map((family) => (
              <div key={family.key} className="flex flex-col gap-2 border border-line px-3 py-2">
                <label className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isFamilyTicked(family)}
                      disabled={disabled}
                      onChange={() => toggleFamily(family)}
                      className="accent-accent"
                    />
                    <FamilyPreview family={family} />
                  </span>
                  <span className="catalog-number text-3xs">
                    {family.variants.length} variant{family.variants.length === 1 ? "" : "s"}
                  </span>
                </label>

                {family.variants.length > 1 && (
                  <div className="flex flex-col gap-1.5 border-t border-line pt-2">
                    {family.variants.map((variant, i) => (
                      <label
                        key={`${variant.file.name}-${variant.file.size}-${i}`}
                        className="flex items-center gap-2 text-xs text-ink-soft"
                      >
                        <input
                          type="checkbox"
                          checked={!uncheckedVariants.has(variant.file)}
                          disabled={disabled}
                          onChange={() => toggleVariant(variant.file, family)}
                          className="accent-accent"
                        />
                        <span className="truncate font-mono text-ink">{variant.file.name}</span>
                        <span className="text-ink-faint">— {variant.weightLabel}</span>
                      </label>
                    ))}
                  </div>
                )}

                {errors[family.key] && (
                  <p className="text-xs text-accent">{errors[family.key]}</p>
                )}
              </div>
            ))}
          </div>
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
