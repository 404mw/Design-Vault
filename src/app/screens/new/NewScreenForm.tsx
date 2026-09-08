"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  SubmitButton,
  VerdictField,
  TagsInput,
} from "@/components/specimen";
import { PAGE_TYPES, LAYOUT_PATTERNS, PRESET_TAGS } from "@/lib/constants";
import { createScreen, type NewScreenState } from "./actions";
import { UploadDropzone } from "./UploadDropzone";

const initialState: NewScreenState = {};

export function NewScreenForm({ tagNames }: { tagNames: string[] }) {
  const [state, formAction] = useActionState(createScreen, initialState);
  const [sourceUrl, setSourceUrl] = useState(state.values?.source_url ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p className="border border-accent bg-paper-raised px-3 py-2 font-serif text-sm text-accent">
          {state.error}
        </p>
      )}

      <Field label="Specimen" required>
        <UploadDropzone onUrlCaptured={setSourceUrl} />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Page type" required>
          <Select name="page_type" required defaultValue={state.values?.page_type ?? ""}>
            <option value="" disabled>
              Choose one
            </option>
            {PAGE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Layout pattern" required>
          <Select
            name="layout_pattern"
            required
            defaultValue={state.values?.layout_pattern ?? ""}
          >
            <option value="" disabled>
              Choose one
            </option>
            {LAYOUT_PATTERNS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Verdict" required>
        <VerdictField name="verdict" />
      </Field>

      <Field label="Why — one line" hint="Optional, but a save with a reason ages better.">
        <TextArea
          name="why"
          rows={2}
          defaultValue={state.values?.why ?? ""}
          placeholder="Why this is a keep or a reject, in one line."
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto]">
        <Field label="Code snippet" hint="Optional — CSS/JS only.">
          <TextArea
            name="snippet"
            rows={4}
            defaultValue={state.values?.snippet ?? ""}
            className="font-catalog-mono text-xs"
          />
        </Field>
        <Field label="Language">
          <Select name="snippet_lang" defaultValue={state.values?.snippet_lang ?? ""}>
            <option value="">—</option>
            <option value="css">CSS</option>
            <option value="js">JS</option>
          </Select>
        </Field>
      </div>

      <Field label="Source URL" hint="Most saved items won't have one — that's expected.">
        <TextInput
          name="source_url"
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
        />
      </Field>

      <Field label="Tags" hint="Pick a preset, reuse one already in the library, or type a new one.">
        <TagsInput
          name="tags"
          presetTags={PRESET_TAGS}
          existingTags={tagNames}
          defaultValue={state.values?.tags ?? ""}
        />
      </Field>

      <div className="flex items-center gap-4 border-t border-line pt-6">
        <SubmitButton>Save specimen</SubmitButton>
        <Link href="/screens" className="catalog-label text-2xs text-ink-faint hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
