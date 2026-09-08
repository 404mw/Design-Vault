import { db } from "@/lib/db";
import { Modal } from "@/components/specimen";
import { ScreenDetail } from "../../[id]/ScreenDetail";
import { NewScreenForm } from "../../new/NewScreenForm";

export default async function ScreenModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === "new") {
    const tags = db.prepare("SELECT name FROM tags ORDER BY name").all() as {
      name: string;
    }[];
    const tagNames = tags.map((t) => t.name);

    return (
      <Modal>
        <NewScreenForm tagNames={tagNames} />
      </Modal>
    );
  }

  return (
    <Modal>
      <ScreenDetail id={id} />
    </Modal>
  );
}
