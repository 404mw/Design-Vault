import { NewFontForm } from "./NewFontForm";

export default function NewFontPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-sans text-2xl text-ink">Add a font</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Add every variant file you have — one font is saved per family, with the family name and
          weight read from each file, never typed.
        </p>
      </div>

      <NewFontForm />
    </div>
  );
}
