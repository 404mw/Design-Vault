import { db } from "@/lib/db";
import { Modal } from "@/components/specimen";
import { ComponentDetail } from "../../[id]/ComponentDetail";
import { NewComponentForm } from "../../new/NewComponentForm";

export default async function ComponentModal({
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
        <NewComponentForm tagNames={tagNames} />
      </Modal>
    );
  }

  return (
    <Modal>
      <ComponentDetail id={id} />
    </Modal>
  );
}
