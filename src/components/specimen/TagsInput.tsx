"use client";

import { useMemo, useState } from "react";
import { Pill } from "./Pill";

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

/**
 * Tag picker for the "new screen" form: curated preset pills plus every tag
 * already used, one click to toggle either onto the selection, and a
 * manual field for anything new. Everything serializes into a single
 * comma-separated hidden input under `name`, so the server action's
 * existing parsing (split on comma, lowercase, dedupe) needs no changes —
 * a tag typed here that doesn't exist yet becomes available to every future
 * item the moment this form is submitted, because the server action writes
 * it into the shared tags table like any other.
 */
export function TagsInput({
  name,
  presetTags,
  existingTags,
  defaultValue = "",
}: {
  name: string;
  presetTags: readonly string[];
  existingTags: string[];
  defaultValue?: string;
}) {
  const [selected, setSelected] = useState<string[]>(() => parseTags(defaultValue));
  const [draft, setDraft] = useState("");

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of [...presetTags, ...existingTags]) {
      const lower = t.trim().toLowerCase();
      if (lower && !seen.has(lower)) {
        seen.add(lower);
        out.push(lower);
      }
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [presetTags, existingTags]);

  function toggle(tag: string) {
    setSelected((current) =>
      current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
    );
  }

  function addDraft() {
    const tag = draft.trim().toLowerCase();
    if (!tag) return;
    setSelected((current) => (current.includes(tag) ? current : [...current, tag]));
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Pill key={tag} as="button" active onClick={() => toggle(tag)} title="Remove tag">
              {tag} ×
            </Pill>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {suggestions
          .filter((tag) => !selected.includes(tag))
          .map((tag) => (
            <Pill key={tag} as="button" onClick={() => toggle(tag)}>
              {tag}
            </Pill>
          ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addDraft();
            }
          }}
          placeholder="Type a new tag, press Enter"
          className="w-full border border-line bg-paper px-3 py-2 font-serif text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <button
          type="button"
          onClick={addDraft}
          className="catalog-label whitespace-nowrap border border-line px-3 py-2 text-2xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
        >
          Add
        </button>
      </div>

      <input type="hidden" name={name} value={selected.join(", ")} readOnly />
    </div>
  );
}
