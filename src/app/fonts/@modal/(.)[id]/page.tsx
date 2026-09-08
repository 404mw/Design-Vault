import { Modal } from "@/components/specimen";
import { FontDetail } from "../../[id]/FontDetail";
import { NewFontForm } from "../../new/NewFontForm";

export default async function FontModal({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    const { error } = await searchParams;
    return (
      <Modal>
        <NewFontForm error={error} />
      </Modal>
    );
  }

  return (
    <Modal>
      <FontDetail id={id} />
    </Modal>
  );
}
