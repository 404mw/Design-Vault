import { Field, SubmitButton, TagsInput } from "@/components/specimen";
import { PRESET_TAGS } from "@/lib/constants";
import { PaletteColorRows } from "./PaletteColorRows";
import { createPalette } from "./actions";

export function NewPaletteForm({ tagNames }: { tagNames: string[] }) {
  return (
    <form action={createPalette} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="catalog-label text-2xs text-ink-soft">
          Colors <span className="text-accent">*</span>
        </p>
        <p className="text-xs text-ink-faint">
          Minimum 2 colors. Each needs a name, a hex value, and a role — defaults to
          &ldquo;any&rdquo; if you don&apos;t have a specific one in mind.
        </p>
        <PaletteColorRows />
      </div>

      <Field label="Tags" hint="Pick a preset, reuse one already in the library, or type a new one.">
        <TagsInput name="tags" presetTags={PRESET_TAGS} existingTags={tagNames} />
      </Field>

      <div>
        <SubmitButton>Save palette</SubmitButton>
      </div>
    </form>
  );
}
