import { db } from "@/lib/db";
import { NewScreenForm } from "./NewScreenForm";

// Reads distinct tag names on every request for the autocomplete datalist.
export const dynamic = "force-dynamic";

export default function NewScreenPage() {
  const tags = db.prepare("SELECT name FROM tags ORDER BY name").all() as {
    name: string;
  }[];
  const tagNames = tags.map((t) => t.name);

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl text-ink">File a New Specimen</h1>
      </header>
      <NewScreenForm tagNames={tagNames} />
    </div>
  );
}
