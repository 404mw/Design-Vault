import { ScreenDetail } from "./ScreenDetail";

// Detail view reads the DB directly — must re-query on every request.
export const dynamic = "force-dynamic";

export default async function ScreenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <ScreenDetail id={id} />
    </div>
  );
}
