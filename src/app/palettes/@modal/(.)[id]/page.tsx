import { Modal } from "@/components/specimen";
import { PaletteDetail } from "../../[id]/PaletteDetail";
import { NewPaletteForm } from "../../new/NewPaletteForm";

export default async function PaletteModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <Modal>
        <NewPaletteForm />
      </Modal>
    );
  }

  return (
    <Modal>
      <PaletteDetail id={id} />
    </Modal>
  );
}
