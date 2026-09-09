import { ComponentDetail } from "./ComponentDetail";

// Detail view reads the DB directly — must re-query on every request.
export const dynamic = "force-dynamic";

export default async function ComponentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <ComponentDetail id={id} />
    </div>
  );
}
