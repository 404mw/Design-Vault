import { notFound } from "next/navigation";
import { NewScreenForm } from "../../new/NewScreenForm";
import { loadEditScreenInitial } from "./loadInitial";

// Reads the DB directly — must re-query on every request.
export const dynamic = "force-dynamic";

export default async function EditScreenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = loadEditScreenInitial(id);
  if (!data) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-8 border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl text-ink">Edit Specimen</h1>
      </header>
      <NewScreenForm
        tagNames={data.tagNames}
        mode="edit"
        initial={data.initial}
        linkedPaletteId={data.linkedPaletteId}
      />
    </div>
  );
}
