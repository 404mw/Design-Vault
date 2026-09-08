/**
 * Hosts the `@modal` parallel slot alongside the normal route tree — see
 * src/app/screens/layout.tsx for the full explanation of the pattern.
 */
export default function PalettesLayout({
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
