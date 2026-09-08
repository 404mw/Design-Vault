import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ConfirmButton, Pill, VerdictStamp } from "@/components/specimen";
import { db } from "@/lib/db";
import type { MediaType, Verdict } from "@/lib/constants";
import { CopyButton } from "./CopyButton";

type ScreenRow = {
  id: number;
  media_type: MediaType;
  file_path: string;
  page_type: string;
  layout_pattern: string;
  verdict: Verdict;
  why: string;
  snippet: string | null;
  snippet_lang: string | null;
  source_url: string | null;
  created_at: string;
};

type TagRow = { name: string };

/**
 * The screen detail content, shared verbatim between the standalone
 * `/screens/[id]` page (direct navigation, hard refresh) and the
 * `@modal/(.)[id]` intercepted route (clicking a card from the grid) — same
 * data, same markup, just wrapped differently by each caller.
 */
export async function ScreenDetail({ id }: { id: string }) {
  const screenId = Number(id);
  if (!Number.isInteger(screenId)) notFound();

  const screen = db.prepare("SELECT * FROM ui_screens WHERE id = ?").get(screenId) as
    | ScreenRow
    | undefined;

  if (!screen) notFound();

  const tags = db
    .prepare(
      `SELECT t.name FROM tags t
       JOIN ui_screen_tags ust ON ust.tag_id = t.id
       WHERE ust.screen_id = ?
       ORDER BY t.name`,
    )
    .all(screenId) as TagRow[];

  // The library must stay curated, not just large — deletion is a real
  // requirement here, not a nice-to-have.
  async function deleteScreen() {
    "use server";
    db.prepare("DELETE FROM ui_screens WHERE id = ?").run(screenId);
    redirect("/screens");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between border-b border-line-strong pb-4">
        <h1 className="font-display text-2xl capitalize text-ink">{screen.page_type}</h1>
        <div className="flex items-center gap-3">
          <span className="catalog-number text-2xs text-ink-faint">
            PLATE {String(screen.id).padStart(3, "0")}
          </span>
          <VerdictStamp verdict={screen.verdict} />
        </div>
      </div>

      <div className="overflow-hidden border border-line bg-paper-deep">
        {screen.media_type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={screen.file_path} controls className="w-full" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={screen.file_path}
            alt={screen.why || `${screen.page_type} screen`}
            className="w-full"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="catalog-label text-3xs text-ink-faint">Page type</p>
          <p className="font-serif text-sm text-ink">{screen.page_type}</p>
        </div>
        <div>
          <p className="catalog-label text-3xs text-ink-faint">Layout pattern</p>
          <p className="font-serif text-sm text-ink">{screen.layout_pattern}</p>
        </div>
      </div>

      {screen.why && (
        <div>
          <p className="catalog-label text-3xs text-ink-faint">Why</p>
          <p className="font-serif text-sm text-ink">{screen.why}</p>
        </div>
      )}

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

      {screen.source_url && (
        <div>
          <p className="catalog-label text-3xs text-ink-faint">Source</p>
          <a
            href={screen.source_url}
            target="_blank"
            rel="noreferrer"
            className="break-all font-serif text-sm text-accent underline underline-offset-2"
          >
            {screen.source_url}
          </a>
        </div>
      )}

      {screen.snippet && (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="catalog-label text-3xs text-ink-faint">
              Snippet{screen.snippet_lang ? ` · ${screen.snippet_lang}` : ""}
            </p>
            <CopyButton text={screen.snippet} />
          </div>
          <pre className="overflow-x-auto border border-line bg-paper-raised p-3">
            <code className="font-catalog-mono text-xs text-ink">{screen.snippet}</code>
          </pre>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-line pt-6">
        <Link href="/screens" className="catalog-label text-2xs text-ink-faint hover:text-ink">
          ← Back to index
        </Link>
        <form action={deleteScreen}>
          <ConfirmButton
            confirmMessage="Delete this specimen? This can't be undone."
            className="catalog-label border border-accent px-4 py-2 text-2xs text-accent transition-colors hover:bg-accent hover:text-paper"
          >
            Delete specimen
          </ConfirmButton>
        </form>
      </div>
    </div>
  );
}
