import { notFound } from "next/navigation";
import { Modal } from "@/components/specimen";
import { NewScreenForm } from "../../../new/NewScreenForm";
import { loadEditScreenInitial } from "../../../[id]/edit/loadInitial";

/**
 * Intercepts client-side nav to `/screens/[id]/edit` (from the "Edit" link
 * on `ScreenDetail`, itself already shown as a modal) and renders the edit
 * form as a modal over the grid — same `(.)[id]` interception the detail and
 * "new" routes use, one nested segment deeper. A hard refresh or direct load
 * of `/screens/5/edit` never goes through this; it lands on the real
 * `[id]/edit/page.tsx` instead.
 */
export default async function ScreenEditModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = loadEditScreenInitial(id);
  if (!data) notFound();

  return (
    <Modal>
      <NewScreenForm
        tagNames={data.tagNames}
        mode="edit"
        initial={data.initial}
        linkedPaletteId={data.linkedPaletteId}
      />
    </Modal>
  );
}
