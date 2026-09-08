import { SubmitButton } from "@/components/specimen";
import { PaletteColorRows } from "./PaletteColorRows";
import { createPalette } from "./actions";

export function NewPaletteForm() {
  return (
    <form action={createPalette} className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="catalog-label text-2xs text-ink-soft">
          Colors <span className="text-accent">*</span>
        </p>
        <p className="text-xs text-ink-faint">
          Minimum 2 colors. Each needs a name, a hex value, and a role.
        </p>
        <PaletteColorRows />
      </div>

      <div>
        <SubmitButton>Save palette</SubmitButton>
      </div>
    </form>
  );
}
