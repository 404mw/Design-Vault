/**
 * Hosts the `@modal` parallel slot alongside the normal route tree. When a
 * card in the grid is clicked, Next.js intercepts the client-side
 * navigation to `/components/[id]` and renders it here in `modal` instead of
 * replacing `children` — so the grid stays mounted underneath. A direct
 * load of `/components/5` (hard refresh, external link) never goes through
 * this slot at all; it renders `[id]/page.tsx` as `children` instead.
 */
export default function ComponentsLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
