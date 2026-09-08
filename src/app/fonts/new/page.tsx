import { NewFontForm } from "./NewFontForm";

export default async function NewFontPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Add a font</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pick every variant file for this family — the family name and weight are read from
          each one, never typed.
        </p>
      </div>

      <NewFontForm error={error} />
    </div>
  );
}
