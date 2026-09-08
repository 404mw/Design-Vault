import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { ConfirmButton } from "@/components/specimen";
import { FontFace } from "../FontFace";

type FontRow = {
  id: number;
  family_name: string;
  weights: string;
  file_path: string;
  foundry: string | null;
  source_url: string | null;
  licence: string;
  created_at: string;
};

type FontFileRow = { id: number; file_path: string; weight_label: string };

const PANGRAM = "The quick brown fox jumps over the lazy dog";

/**
 * The font detail content, shared verbatim between the standalone
 * `/fonts/[id]` page and the `@modal/(.)[id]` intercepted route.
 */
export async function FontDetail({ id }: { id: string }) {
  const row = db.prepare(`SELECT * FROM fonts WHERE id = ?`).get(id) as FontRow | undefined;

  if (!row) notFound();

  const extraVariants = db
    .prepare(`SELECT id, file_path, weight_label FROM font_files WHERE font_id = ? ORDER BY position`)
    .all(id) as FontFileRow[];

  const variants = [
    { id: row.id, filePath: row.file_path, weightLabel: row.weights, isPrimary: true },
    ...extraVariants.map((v) => ({
      id: v.id,
      filePath: v.file_path,
      weightLabel: v.weight_label,
      isPrimary: false,
    })),
  ];

  async function deleteFont() {
    "use server";

    const font = db.prepare(`SELECT * FROM fonts WHERE id = ?`).get(id) as
      | FontRow
      | undefined;
    const files = db
      .prepare(`SELECT file_path FROM font_files WHERE font_id = ?`)
      .all(id) as { file_path: string }[];

    if (font) {
      db.prepare(`DELETE FROM fonts WHERE id = ?`).run(id);
      const allPaths = [font.file_path, ...files.map((f) => f.file_path)];
      await Promise.all(
        allPaths.map((p) => fs.rm(path.join(process.cwd(), "public", p), { force: true })),
      );
    }

    redirect("/fonts");
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <span className="catalog-number text-2xs text-ink-faint">
          PLATE {String(row.id).padStart(3, "0")}
        </span>
        <Link href="/fonts" className="catalog-label text-2xs text-ink-soft hover:text-ink">
          ← Back to Fonts
        </Link>
      </div>

      <div className="space-y-6 border border-line bg-paper-raised p-8">
        <FontFace
          id={`f${row.id}`}
          filePath={row.file_path}
          familyName={row.family_name}
          className="block text-5xl leading-tight text-ink break-words"
        >
          {row.family_name}
        </FontFace>
      </div>

      {variants.length > 1 && (
        <div>
          <p className="catalog-label mb-3 text-2xs text-ink-soft">
            Specimen sheet — {variants.length} variants
          </p>
          <div className="divide-y divide-line border border-line">
            {variants.map((v) => (
              <div key={v.id} className="space-y-1.5 px-4 py-4">
                <p className="catalog-label text-3xs text-ink-faint">{v.weightLabel}</p>
                <FontFace
                  id={v.isPrimary ? `f${row.id}` : `f${row.id}-v${v.id}`}
                  filePath={v.filePath}
                  familyName={row.family_name}
                  className="block text-xl leading-snug text-ink"
                >
                  {PANGRAM}
                </FontFace>
              </div>
            ))}
          </div>
        </div>
      )}

      {variants.length === 1 && (
        <FontFace
          id={`f${row.id}`}
          filePath={row.file_path}
          familyName={row.family_name}
          className="block text-xl leading-snug text-ink-soft"
        >
          {PANGRAM}
        </FontFace>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 sm:grid-cols-4">
        <div>
          <dt className="catalog-label text-3xs text-ink-faint">Weight</dt>
          <dd className="mt-1 font-serif text-sm text-ink">
            {variants.length > 1 ? `${variants.length} variants` : row.weights}
          </dd>
        </div>
        <div>
          <dt className="catalog-label text-3xs text-ink-faint">Licence</dt>
          <dd className="mt-1 font-serif text-sm text-ink">{row.licence}</dd>
        </div>
        <div>
          <dt className="catalog-label text-3xs text-ink-faint">Foundry</dt>
          <dd className="mt-1 font-serif text-sm text-ink">{row.foundry || "—"}</dd>
        </div>
        <div>
          <dt className="catalog-label text-3xs text-ink-faint">Source</dt>
          <dd className="mt-1 font-serif text-sm text-ink">
            {row.source_url ? (
              <a
                href={row.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                link
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
        <div>
          <dt className="catalog-label text-3xs text-ink-faint">Uploaded</dt>
          <dd className="mt-1 font-serif text-sm text-ink">{row.created_at}</dd>
        </div>
      </dl>

      <form action={deleteFont} className="border-t border-line pt-5">
        <ConfirmButton
          confirmMessage="Delete this font? This can't be undone."
          className="catalog-label border border-accent px-4 py-2 text-2xs text-accent transition-colors hover:bg-accent hover:text-paper"
        >
          Delete this specimen
        </ConfirmButton>
      </form>
    </div>
  );
}
