import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ConfirmButton, Pill } from "@/components/specimen";
import { CopyHex } from "./CopyHex";
import { deletePalette } from "./actions";
import { aaResult, aaaResult, contrastRatio } from "@/lib/contrast";

type PaletteRow = { id: number; name: string; created_at: string };
type ColorRow = {
  id: number;
  palette_id: number;
  name: string;
  hex: string;
  role: string;
  position: number;
};
type TagRow = { name: string };

/**
 * The palette detail content, shared verbatim between the standalone
 * `/palettes/[id]` page and the `@modal/(.)[id]` intercepted route.
 */
export async function PaletteDetail({ id }: { id: string }) {
  const paletteId = Number(id);
  if (!Number.isInteger(paletteId)) notFound();

  const palette = db.prepare("SELECT * FROM palettes WHERE id = ?").get(paletteId) as
    | PaletteRow
    | undefined;
  if (!palette) notFound();

  const colors = db
    .prepare("SELECT * FROM palette_colors WHERE palette_id = ? ORDER BY position")
    .all(paletteId) as ColorRow[];

  const tags = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN palette_tags pt ON pt.tag_id = t.id
       WHERE pt.palette_id = ?
       ORDER BY t.name`,
    )
    .all(paletteId) as TagRow[];

  const textColors = colors.filter((c) => c.role === "text");
  const bgColors = colors.filter((c) => c.role === "background" || c.role === "surface");

  const pairs = textColors.flatMap((text) =>
    bgColors.map((bg) => ({
      text,
      bg,
      ratio: contrastRatio(text.hex, bg.hex),
    }))
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl text-ink">
          {colors.length}-Color Palette
        </h1>
        <div className="flex items-center gap-4">
          <span className="catalog-number text-2xs text-ink-faint">
            PLATE {String(palette.id).padStart(3, "0")}
          </span>
          <a
            href={`/api/palettes/${palette.id}/export`}
            className="catalog-label border border-ink px-4 py-2 text-2xs text-ink transition-colors hover:border-accent hover:text-accent"
          >
            Export tokens (.css)
          </a>
          <form action={deletePalette}>
            <input type="hidden" name="id" value={palette.id} />
            <ConfirmButton
              confirmMessage="Delete this palette? This can't be undone."
              className="catalog-label text-2xs text-ink-faint transition-colors hover:text-accent"
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>

      <section className="mb-10">
        <p className="catalog-label mb-3 text-2xs text-ink-soft">Swatches</p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {colors.map((c) => (
            <CopyHex key={c.id} hex={c.hex} name={c.name} role={c.role} />
          ))}
        </div>
      </section>

      {tags.length > 0 && (
        <section className="mb-10">
          <p className="catalog-label mb-3 text-2xs text-ink-soft">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Pill key={t.name}>{t.name}</Pill>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <p className="catalog-label mb-3 text-2xs text-ink-soft">Contrast check</p>
        {textColors.length === 0 || bgColors.length === 0 ? (
          <p className="text-sm text-ink-faint">
            Nothing to check here — this palette needs at least one color with the{" "}
            <span className="catalog-label text-2xs text-ink-soft">text</span> role and one
            with the <span className="catalog-label text-2xs text-ink-soft">background</span>{" "}
            or <span className="catalog-label text-2xs text-ink-soft">surface</span> role.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line-strong text-left">
                  <th className="catalog-label py-2 pr-3 text-3xs text-ink-faint">Text</th>
                  <th className="catalog-label py-2 pr-3 text-3xs text-ink-faint">
                    Background
                  </th>
                  <th className="catalog-label py-2 pr-3 text-3xs text-ink-faint">Ratio</th>
                  <th className="catalog-label py-2 pr-3 text-3xs text-ink-faint">AA</th>
                  <th className="catalog-label py-2 text-3xs text-ink-faint">AAA</th>
                </tr>
              </thead>
              <tbody>
                {pairs.map(({ text, bg, ratio }) => (
                  <tr key={`${text.id}-${bg.id}`} className="border-b border-line">
                    <td className="py-2 pr-3">
                      <span
                        className="mr-2 inline-block h-3 w-3 border border-line align-middle"
                        style={{ backgroundColor: text.hex }}
                        aria-hidden
                      />
                      {text.name}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="mr-2 inline-block h-3 w-3 border border-line align-middle"
                        style={{ backgroundColor: bg.hex }}
                        aria-hidden
                      />
                      {bg.name}
                    </td>
                    <td className="catalog-number py-2 pr-3">{ratio.toFixed(2)}:1</td>
                    <td className="py-2 pr-3">{aaResult(ratio)}</td>
                    <td className="py-2">{aaaResult(ratio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Link href="/palettes" className="catalog-label text-2xs text-ink-soft hover:text-accent">
        ← Back to palettes
      </Link>
    </div>
  );
}
