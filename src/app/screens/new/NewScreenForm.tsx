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
  ColourPicker,
} from "@/components/specimen";
import { PAGE_TYPES, LAYOUT_PATTERNS, PRESET_TAGS } from "@/lib/constants";
import { createScreen, type NewScreenState } from "./actions";
import { updateScreen } from "../[id]/edit/actions";
import { UploadDropzone, type SpecimenPreview } from "./UploadDropzone";

const emptyState: NewScreenState = {};

export type ScreenInitialValues = {
  id: number;
  page_type: string;
  layout_pattern: string;
  verdict: string;
  why: string;
  snippet: string;
  snippet_lang: string;
  source_url: string;
  tags: string;
  media_type: "image" | "video";
  file_path: string;
};

export function NewScreenForm({
  tagNames,
  mode = "create",
  initial,
  linkedPaletteId = null,
}: {
  tagNames: string[];
  /** "edit" prefills every field from `initial` and submits to `updateScreen` instead of `createScreen`. */
  mode?: "create" | "edit";
  initial?: ScreenInitialValues;
  /** Edit mode only: if the screen already has a linked palette, colours aren't editable here — link to it instead. */
  linkedPaletteId?: number | null;
}) {
  const isEdit = mode === "edit" && initial;

  const action = isEdit ? updateScreen.bind(null, initial.id) : createScreen;
  const initialState: NewScreenState = isEdit
    ? {
        values: {
          page_type: initial.page_type,
          layout_pattern: initial.layout_pattern,
          verdict: initial.verdict,
          why: initial.why,
          snippet: initial.snippet,
          snippet_lang: initial.snippet_lang,
          source_url: initial.source_url,
          tags: initial.tags,
        },
      }
    : emptyState;

  const [state, formAction] = useActionState(action, initialState);
  const [sourceUrl, setSourceUrl] = useState(state.values?.source_url ?? "");
  const [specimen, setSpecimen] = useState<SpecimenPreview | null>(
    isEdit
      ? {
          mediaType: initial.media_type,
          extractSrc: initial.media_type === "image" ? initial.file_path : null,
        }
      : null,
  );
  const [colours, setColours] = useState<string[]>([]);
  const [savePalette, setSavePalette] = useState(true);

  // The specimen changing (new file/URL, or a switch to video) must drop any
  // previously extracted/picked colours immediately — otherwise the hidden
  // palette_hex inputs could still carry the old image's colours for a beat
  // before extraction runs against the new one, and could still submit them
  // if the user didn't wait for that. Submit stays disabled (<2 colours)
  // until extraction repopulates the list.
  function handleSpecimenChange(preview: SpecimenPreview | null) {
    setSpecimen(preview);
    setColours([]);
  }

  const showColourPicker =
    specimen?.mediaType === "image" && Boolean(specimen?.extractSrc) && !linkedPaletteId;
  const paletteBlocksSubmit = showColourPicker && savePalette && colours.length < 2;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <p className="border border-accent bg-paper-raised px-3 py-2 font-serif text-sm text-accent">
          {state.error}
        </p>
      )}

      <Field label="Specimen" required={!isEdit} hint={isEdit ? "Leave as-is to keep the current file." : undefined}>
        <UploadDropzone
          onUrlCaptured={setSourceUrl}
          onSpecimenChange={handleSpecimenChange}
          existingPreview={isEdit ? { url: initial.file_path, mediaType: initial.media_type } : null}
        />
      </Field>

      {linkedPaletteId ? (
        <Field label="Colours">
          <Link
            href={`/palettes/${linkedPaletteId}`}
            className="font-serif text-sm text-accent underline underline-offset-2"
          >
            This screen&apos;s colours live in its linked palette →
          </Link>
        </Field>
      ) : (
        showColourPicker &&
        specimen?.extractSrc && (
          <Field
            label="Colours"
            hint="Auto-extracted from the image — remove any you don't want, or add more from the preview below."
          >
            <ColourPicker
              imageSrc={specimen.extractSrc}
              colours={colours}
              onColoursChange={setColours}
              savePalette={savePalette}
              onSavePaletteChange={setSavePalette}
            />
          </Field>
        )
      )}

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
        <VerdictField name="verdict" defaultValue={state.values?.verdict} />
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
        <SubmitButton disabled={paletteBlocksSubmit}>
          {isEdit ? "Save changes" : "Save specimen"}
        </SubmitButton>
        <Link
          href={isEdit ? `/screens/${initial.id}` : "/screens"}
          className="catalog-label text-2xs text-ink-faint hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
