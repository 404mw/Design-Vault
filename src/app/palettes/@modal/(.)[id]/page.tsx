import { Modal } from "@/components/specimen";
import { db } from "@/lib/db";
import { PaletteDetail } from "../../[id]/PaletteDetail";
import { NewPaletteForm } from "../../new/NewPaletteForm";

export default async function PaletteModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    const tagNames = (
      db.prepare("SELECT name FROM tags ORDER BY name").all() as { name: string }[]
    ).map((t) => t.name);
    return (
      <Modal>
        <NewPaletteForm tagNames={tagNames} />
      </Modal>
    );
  }

  return (
    <Modal>
      <PaletteDetail id={id} />
    </Modal>
  );
}
