"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  SubmitButton,
  TagsInput,
} from "@/components/specimen";
import { COMPONENT_TYPES, PRESET_TAGS } from "@/lib/constants";
import { createComponent, type NewComponentState } from "./actions";
import { UploadDropzone } from "./UploadDropzone";

const initialState: NewComponentState = {};

export function NewComponentForm({ tagNames }: { tagNames: string[] }) {
  const [state, formAction] = useActionState(createComponent, initialState);
  const [sourceUrl, setSourceUrl] = useState(state.values?.source_url ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p className="border border-accent bg-paper-raised px-3 py-2 font-serif text-sm text-accent">
          {state.error}
        </p>
      )}

      <Field label="Name" required>
        <TextInput name="name" required defaultValue={state.values?.name ?? ""} />
      </Field>

      <Field label="Preview" required>
        <UploadDropzone onUrlCaptured={setSourceUrl} />
      </Field>

      <Field label="Component type" required>
        <Select name="component_type" required defaultValue={state.values?.component_type ?? ""}>
          <option value="" disabled>
            Choose one
          </option>
          {COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto]">
        <Field label="Source code" hint="Optional — CSS/JS only.">
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
            <option value="jsx">JSX</option>
            <option value="tsx">TSX</option>
          </Select>
        </Field>
      </div>

      <Field label="Link" hint="Most saved components won't have one — that's expected.">
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
        <SubmitButton>Save component</SubmitButton>
        <Link href="/components" className="catalog-label text-2xs text-ink-faint hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
