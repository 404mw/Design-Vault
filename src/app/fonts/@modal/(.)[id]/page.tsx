import { Modal } from "@/components/specimen";
import { FontDetail } from "../../[id]/FontDetail";
import { NewFontForm } from "../../new/NewFontForm";

export default async function FontModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    return (
      <Modal>
        <NewFontForm />
      </Modal>
    );
  }

  return (
    <Modal>
      <FontDetail id={id} />
    </Modal>
  );
}
