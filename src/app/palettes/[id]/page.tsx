export const dynamic = "force-dynamic";

import { PaletteDetail } from "./PaletteDetail";

export default async function PalettePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl">
      <PaletteDetail id={id} />
    </div>
  );
}
