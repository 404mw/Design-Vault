import { FontDetail } from "./FontDetail";

export const dynamic = "force-dynamic";

export default async function FontDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-2xl">
      <FontDetail id={id} />
    </div>
  );
}
