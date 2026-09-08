# Fonts (`/fonts`)

A library of saved font families. Each entry is a family with one or more uploaded variant files
(weights/styles), a licence, and optional foundry/source metadata, browsable as a grid rendered in
the actual uploaded typeface.

## Routes

- `GET /fonts` — browse/search grid (`src/app/fonts/page.tsx`)
- `GET /fonts/new` — add form, full page or modal depending on navigation (see below)
  (`src/app/fonts/new/page.tsx`)
- `GET /fonts/[id]` — detail view, full page or modal depending on navigation

## Modal-on-click vs full-page-on-direct-load

Uses the same `@modal` parallel-slot + intercepting-route pattern as `/screens` — see
`docs/features/screens.md` for the full explanation. The route tree under `src/app/fonts/` mirrors
it exactly: `layout.tsx` renders `{children}{modal}`; `[id]/page.tsx` is the real detail page and
`new/page.tsx` the real add-form page, both for direct/non-intercepted loads;
`@modal/(.)[id]/page.tsx` intercepts client-side nav from the grid and, for a real id, wraps
`FontDetail` in `Modal`, or, when `id === "new"` (a client-side nav to `/fonts/new`), wraps the
shared `NewFontForm` component in `Modal` instead — so "+ New Font" opens as a modal over the grid
rather than navigating to a separate page; `@modal/default.tsx`, `@modal/page.tsx`, and
`@modal/[...catchAll]/page.tsx` are `null`-rendering placeholders that keep the modal slot from
holding stale content on other navigations.

## Browse grid (`/fonts`)

Browse-first: the grid always renders every font (`ORDER BY id DESC`) by default; search narrows
it, it never gates it (Constitution Rule 002). `dynamic = "force-dynamic"`.

Search (`q`) matches `family_name` or `foundry` via `LIKE %q%`.

Each grid card (`SpecimenPlate`) shows the family name as its title, and as specs: either the
number of variants (`"{n} variants"`, counted from `font_files` plus the primary row) if more than
one variant was uploaded, or the primary weight label otherwise; plus the licence. The card's
sample renders the family name itself set in the actual uploaded font via `FontFace`.

`FontFace` (`src/app/fonts/FontFace.tsx`) injects a per-instance `@font-face` rule scoped to a CSS
family name namespaced by row id (`specimen-{id}` on the grid, `f{id}` / `f{id}-v{variantId}` on
the detail view), so multiple font specimens rendered on the same page never collide with each
other's `@font-face` declarations.

## Add form (`/fonts/new`)

The form is a shared component, `NewFontForm` (`src/app/fonts/new/NewFontForm.tsx`), used both by
the full-page route (`src/app/fonts/new/page.tsx`) and by the modal case of
`@modal/(.)[id]/page.tsx` described above — same form, just wrapped differently depending on how
it was reached. Both routes read an `error` search param and pass it through to the form as a
prop — the modal case (`@modal/(.)[id]/page.tsx`, `id === "new"` branch) awaits its own
`searchParams` and forwards `error` to `NewFontForm` exactly as the full-page route does, so a
failed submission surfaces its message in whichever context it was submitted from rather than only
on the full page.

Fields:
- **Font files** (required) — populated via `FontUploadDropzone`
  (`src/app/fonts/new/FontUploadDropzone.tsx`), which accepts loose font files, whole folders, and
  archives through the same dropzone: drag-and-drop, the OS file picker (ctrl/shift-click for
  multiple, or `webkitdirectory` for folder selection), or a folder dragged as a group (read via
  `DataTransferItem.webkitGetAsEntry()`). Supported archive formats are `.rar` (v4 and v5), `.zip`,
  `.7z`, and `.tar`, expanded client-side in the browser by `libarchive.js` — chosen specifically
  over `node-unrar-js` because the latter wraps RarLab's UnRAR source, whose licence carries a
  non-OSI restriction, which matters for a repo published open-source. Archive expansion happening
  in the browser is also deliberate for a second reason: the server never receives an archive, so
  there's no staging directory, no temp files, no cleanup pass, and no orphaned-file risk —
  `createFont`'s contract is unchanged, it still only ever receives plain font files.

  The archive reader (`src/lib/client-archive.ts`) HEAD-checks its worker script and WASM binary
  (`/libarchive/worker-bundle.js`, `/libarchive/libarchive.wasm`) before opening anything, and wraps
  both `Archive.open()` and the extract step in a 20-second timeout. This exists because
  `libarchive.js` registers no `onerror` on its worker — without the check and timeout, a missing or
  stale asset would leave the extraction promise permanently unsettled and the dropzone stuck on
  "Expanding archive…" with no error surfaced at all. Dropping several items at once accumulates one
  notice per failure rather than letting a later success overwrite an earlier "couldn't open"
  warning, and every "zero usable fonts" outcome is reported explicitly — a `.ttc`-specific message
  when a collection was the only thing found, a generic one otherwise — rather than silently doing
  nothing.

  Whatever the source (loose files, folder, or archive), candidates are filtered down to renderable
  formats only — `.ttf`, `.otf`, `.woff`, `.woff2`. Non-font contents an archive might contain
  (`OFL.txt`, PDFs, `__MACOSX`, dotfiles) are discarded silently as normal archive noise, not
  errors. `.ttc` is not accepted: fontkit can parse a `.ttc` and it would save cleanly, but browsers
  do not render `.ttc` through `@font-face`, so the entry would display its family name in a
  fallback system font — silently defeating the feature's purpose. A selection containing only
  `.ttc` files shows a message telling the user to extract the individual fonts first.

  After expansion and filtering, every candidate is parsed in the browser with fontkit — the same
  library `src/lib/font-parse.ts` uses server-side, so previews match what actually gets saved and
  there's no second parser to keep in sync. Candidates are grouped by parsed family name and shown
  as a picker: each detected family lists its variants with parsed weight labels, previewed in its
  own typeface. The user picks one family and may untick individual variants; only the selected
  files are submitted. This client-side parse is preview only — `createFont` re-parses every
  arriving file with `parseFontFile`, and that server-side parse remains the sole authority for
  family name and weight label, exactly as before.
- **Licence** (required) — one of `LICENCES` (`free`, `personal only`, `commercial`, `unknown`);
  the form defaults to `LICENCES[0]` (`free`) but the hint explicitly tells the user to pick
  `unknown` if unsure rather than leave it unconsidered.
- **Foundry** (optional) — free text.
- **Source** (optional) — a URL, where the font was obtained.

`NewFontForm` warns and disables the submit button when the current picker selection exceeds 50 MB,
mirroring `next.config.ts`'s `experimental.serverActions.bodySizeLimit` — a whole-family selection
(several weights, each potentially large) is what makes that framework limit reachable in practice,
and exceeding it fails outside the `?error=` path with an opaque framework error rather than a
readable message. The disable is powered by an optional `disabled` prop on `SubmitButton`
(`src/components/specimen/FormField.tsx`, shared with the screens and palettes forms), additive and
backward-compatible with its existing callers.

The family name and each file's weight label are never typed by the user — both are parsed
directly from the font file itself via `parseFontFile` (`src/lib/font-parse.ts`, built on
`fontkit`): family name from the font's family/postscript name; weight label from the variable
`wght` axis range if present (`"Variable, {min}–{max}"`), else the OS/2 `usWeightClass` mapped to a
named weight (e.g. `"700 · Bold"`, falling back to nearest known weight if the class is
nonstandard), else `"Regular"` if no weight class is present at all — with `" Italic"` appended
when the subfamily name indicates italic/oblique and the weight label doesn't already say so.

The Server Action (`createFont`, `src/app/fonts/new/actions.ts`) requires every uploaded
file to parse to the *same* family name (case-insensitively) — mixed families in one save fails
with an error naming the distinct families found, since one save is meant to be one family's
variant set. In practice the picker keeps a user from hitting this by accident, since it only
submits files from the single family chosen. On any validation failure, redirects back to
`/fonts/new?error=...` rather than re-rendering inline state. On success: the first parsed file
becomes the `fonts` primary row (`file_path`/`weights` columns), every additional file becomes a
`font_files` row, and it redirects to `/fonts`. Files are saved under
`public/uploads/fonts/<uuid>.<ext>`.

Saving is self-cleaning on failure: file writes and the two DB inserts (`fonts`, then each
`font_files` row) are wrapped in `try`/`catch`, the DB inserts run inside `BEGIN`/`COMMIT`/
`ROLLBACK` as one transaction, and if anything fails partway — a write, or the transaction — every
file already written for that submission is unlinked before routing through the `?error=` redirect.
No file is left on disk without a matching row, on a failed save any more than on a delete.

### Vendored archive-reader assets (`public/libarchive/`)

`public/libarchive/` holds `libarchive.js`'s prebuilt `worker-bundle.js` and `libarchive.wasm`, plus
its `LICENSE`, committed as tracked files — not gitignored, and not covered by Constitution Rule
004's `public/uploads/` scope, since these are third-party build artifacts, not vault data. Three
decisions shape this:

- **Hand-vendored, not `postinstall`-generated.** This project's npm setup blocks dependency install
  scripts, so a `postinstall` step would silently fail to produce these files — exactly the
  "fresh clone is broken at runtime" failure mode Rule 004's local-data boundary is meant to avoid
  elsewhere. Bumping `libarchive.js` means re-copying `dist/worker-bundle.js` and `dist/libarchive.wasm`
  into `public/libarchive/` by hand, in the same change.
- **`libarchive.js` is pinned to an exact version in `package.json`** (no `^`/`~` range) — a caret
  range would let `npm update` bump the main-thread half of the library while the hand-copied worker
  half in `public/libarchive/` stayed behind, and that version mismatch manifests as the same
  never-settling hang the asset-reachability check and timeouts above exist to catch.
- **`LICENSE` travels with the binary.** libarchive is BSD-2-Clause, which requires its copyright
  notice accompany binary redistribution — relevant specifically because this repo is published
  open-source.

## Detail view (`/fonts/[id]`)

Shared content component `FontDetail` (`src/app/fonts/[id]/FontDetail.tsx`) renders:

- Plate number and a back link.
- The family name set large (`text-5xl`) in its own font, in a bordered display block.
- If more than one variant exists: a "specimen sheet" listing every variant (primary row +
  `font_files`, in `position` order) with its weight label and a pangram
  (`"The quick brown fox jumps over the lazy dog"`) rendered in that specific variant's font. If
  only one variant exists, the pangram renders once in that variant instead of a list.
- A metadata grid: weight (or `"{n} variants"` if more than one), licence, foundry (`—` if unset),
  source link (`—` if unset), and upload timestamp.
- A delete action.

Deleting (`deleteFont`, an inline Server Action inside `FontDetail`) is a hard, immediate delete:
removes the `fonts` row (cascading `font_files` via `ON DELETE CASCADE`) and then removes every
variant's file from disk (`public/uploads/fonts/`), including the primary file and all
`font_files` entries, via `fs.rm` with `force: true`. Confirmed via `ConfirmButton`, then redirects
to `/fonts`.

## Data shape

`fonts` table (`src/lib/db.ts`):

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `family_name` | TEXT NOT NULL | parsed from the first uploaded file, never typed |
| `weights` | TEXT NOT NULL | primary file's parsed weight label |
| `file_path` | TEXT NOT NULL | public URL path of the primary variant file |
| `foundry` | TEXT, nullable | |
| `source_url` | TEXT, nullable | |
| `licence` | TEXT NOT NULL | one of `LICENCES` |
| `created_at` | TEXT | default `datetime('now')` |

`font_files` table — extra variant files beyond the primary:

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `font_id` | INTEGER | FK → `fonts.id`, `ON DELETE CASCADE` |
| `file_path` | TEXT NOT NULL | |
| `weight_label` | TEXT NOT NULL | parsed, never typed |
| `position` | INTEGER | display order among extra variants |

## Deliberate deviations from generic CRUD

- **Browse-first landing, not search-first.** Per Constitution Rule 002, the grid always shows
  every font; search narrows it, never gates it.
- **Family name and weight label are always parsed from the file, never user-entered.** The add
  form has no text input for either — this is a deliberate accuracy constraint (a font's own
  metadata is authoritative), not a missing field.
- **One *save* = one family, chosen from whatever the archive contained.** The server-side rule
  (`createFont` rejects mixed families in one submission) is unchanged, but the picker groups
  candidates by family and only submits the one the user selects, so a user shouldn't hit that
  error by accident when a folder or archive contains more than one family.
- **Renderability is an intake gate.** The library only accepts formats a browser can actually
  `@font-face` (`.ttf`/`.otf`/`.woff`/`.woff2`) — an entry that can't render its own name in its own
  typeface has no reason to exist. This is why `.ttc`, though fontkit can parse it, is rejected: it
  would save cleanly but display in a fallback system font, silently defeating the feature.
- **No orphaned files, on either side of the write.** Delete removes files from disk, not just DB
  rows — every variant file (primary and all `font_files`) is unlinked from
  `public/uploads/fonts/` on deletion. The same guarantee runs in reverse on save: if `createFont`
  fails partway through writing files or the DB transaction, every file already written for that
  submission is unlinked before the error is surfaced, so a failed save leaves nothing behind
  either.
- **Licence has no non-answer default worth trusting** — the field is required, and the hint
  explicitly steers an unsure user to the honest `unknown` value rather than leaving it blank.
