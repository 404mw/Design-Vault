import Link from "next/link";
import { NewPaletteForm } from "./NewPaletteForm";

export default function NewPalettePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-baseline justify-between border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl text-ink">Add a palette</h1>
        <Link
          href="/palettes"
          className="catalog-label text-2xs text-ink-soft hover:text-accent"
        >
          ← Back to palettes
        </Link>
      </div>

      <NewPaletteForm />
    </div>
  );
}
