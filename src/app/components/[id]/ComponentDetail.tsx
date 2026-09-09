import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmButton, Pill } from "@/components/specimen";
import { db } from "@/lib/db";
import type { MediaType } from "@/lib/constants";
import { CopyButton } from "./CopyButton";

type ComponentRow = {
  id: number;
  name: string;
  component_type: string;
  media_type: MediaType;
  file_path: string;
  snippet: string | null;
  snippet_lang: string | null;
  source_url: string | null;
  created_at: string;
};

type TagRow = { name: string };

/**
 * The component detail content, shared verbatim between the standalone
 * `/components/[id]` page (direct navigation, hard refresh) and the
 * `@modal/(.)[id]` intercepted route (clicking a card from the grid) — same
 * data, same markup, just wrapped differently by each caller.
 */
export async function ComponentDetail({ id }: { id: string }) {
  const componentId = Number(id);
  if (!Number.isInteger(componentId)) notFound();

  const component = db.prepare("SELECT * FROM ui_components WHERE id = ?").get(componentId) as
    | ComponentRow
    | undefined;

  if (!component) notFound();

  const tags = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN ui_component_tags uct ON uct.tag_id = t.id
       WHERE uct.component_id = ?
       ORDER BY t.name`,
    )
    .all(componentId) as TagRow[];

  // The library must stay curated, not just large — deletion is a real
  // requirement here, not a nice-to-have.
  async function deleteComponent() {
    "use server";
    db.prepare("DELETE FROM ui_components WHERE id = ?").run(componentId);
    redirect("/components");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl text-ink">{component.name}</h1>
        <span className="catalog-number text-2xs text-ink-faint">
          PLATE {String(component.id).padStart(3, "0")}
        </span>
      </div>

      <div className="overflow-hidden border border-line bg-paper-deep">
        {component.media_type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={component.file_path} controls className="w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={component.file_path} alt={component.name} className="w-full" />
        )}
      </div>

      <div>
        <p className="catalog-label text-3xs text-ink-faint">Component type</p>
        <p className="font-serif text-sm text-ink">{component.component_type}</p>
      </div>

      {tags.length > 0 && (
        <div>
          <p className="catalog-label mb-1.5 text-3xs text-ink-faint">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Pill key={t.name}>{t.name}</Pill>
            ))}
          </div>
        </div>
      )}

      {component.source_url && (
        <div>
          <p className="catalog-label text-3xs text-ink-faint">Source</p>
          <a
            href={component.source_url}
            target="_blank"
            rel="noreferrer"
            className="break-all font-serif text-sm text-accent underline underline-offset-2"
          >
            {component.source_url}
          </a>
        </div>
      )}

      {component.snippet && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="catalog-label text-3xs text-ink-faint">
              Source code{component.snippet_lang ? ` · ${component.snippet_lang}` : ""}
            </p>
            <CopyButton text={component.snippet} />
          </div>
          <pre className="overflow-x-auto border border-line bg-paper-raised p-3">
            <code className="font-catalog-mono text-xs text-ink">{component.snippet}</code>
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-6">
        <Link href="/components" className="catalog-label text-2xs text-ink-faint hover:text-ink">
          ← Back to index
        </Link>
        <form action={deleteComponent}>
          <ConfirmButton
            confirmMessage="Delete this component? This can't be undone."
            className="catalog-label border border-accent px-4 py-2 text-2xs text-accent transition-colors hover:bg-accent hover:text-paper"
          >
            Delete component
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
