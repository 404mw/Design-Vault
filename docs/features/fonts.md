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

Browse-first: the grid always renders every font (`ORDER BY id DESC`) by default; search and the
licence filter narrow it, they never gate it (Constitution Rule 002). `dynamic =
"force-dynamic"`.

Search (`q`) matches `family_name` or `foundry` via `LIKE %q%`. Additional filter: `licence`,
validated against `LICENCES` in `src/lib/constants.ts` before being applied — an unrecognized value
is silently ignored rather than erroring.

Search and the licence filter are client-driven, via the shared `IndexBar`/`FilterSelect`
components (see `docs/features/screens.md` for the shared mechanism): typing debounces ~300ms
before updating the URL's `q` query param, no Enter needed; selecting a licence in the dropdown
applies immediately, no debounce. Either way this `force-dynamic` page re-renders against the
updated query params exactly as before.

Each grid card (`SpecimenPlate`) shows the family name as its title, and as specs: the foundry
(only when set), then either the number of variants (`"{n} variants"`, counted from `font_files`
plus the primary row) if more than one variant was uploaded or the primary weight label otherwise,
then the licence; plus the created date. The card's sample renders the family name itself set in the
actual uploaded font via `FontFace`, with a minimum height of `--min-h-font-sample` and otherwise
sized to its content, so font cards stay near-uniform in the masonry grid. Fonts have no tags, so
the card has no tag row. The page opens with the shared `PageHeader` (`Type` icon). Shared
card/grid/header behaviour: `docs/features/app-shell.md`.

Below the heading, the card's `children` slot holds a details list:
- **First row:** `font-family: "Family"` in mono, with a copy button (the shared card copy button)
  at the far right. It copies `font-family: "Family";`, with any `\` or `"` in the family name
  backslash-escaped so the copied declaration is always valid CSS.
- **Then one row per variant:** the primary first, then the `font_files` rows by position. Each row
  shows its weight label rendered in that variant's own font, via `FontFace` with a unique
  namespaced family per variant (`FontFace` id `f{fontId}-v0` for the primary,
  `f{fontId}-v{fontFileId}` for extra files). The primary row's label is `fonts.weights`; an empty
  label on any row shows as "Regular". All
  `font_files` for the visible fonts are fetched in one query, which also yields the variant count.
- At most 4 variant rows are shown, then "+N more". Each shown variant loads one more font file,
  which is why there is a cap.

`FontFace` (`src/app/fonts/FontFace.tsx`) injects a per-instance `@font-face` rule scoped to a CSS
family name namespaced by row id (`specimen-{id}` on the grid, `f{id}` / `f{id}-v{variantId}` on
the detail view; the grid's per-variant rows become `specimen-f{id}-v0` / `specimen-f{id}-v{fileId}`), so
multiple font specimens rendered on the same page never collide with each other's `@font-face`
declarations.

## Add form (`/fonts/new`)

The form is a shared component, `NewFontForm` (`src/app/fonts/new/NewFontForm.tsx`), used both by
the full-page route (`src/app/fonts/new/page.tsx`) and by the modal case of
`@modal/(.)[id]/page.tsx` described above — same form, just wrapped differently depending on how
it was reached. Neither route reads search params: the form submits through a client handler
that calls the save action directly and shows any error inline, so a failed save surfaces in
whichever context (modal or full page) it was submitted from.

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
  there's no staging directory, no temp files, no cleanup pass, and no orphaned-file risk — the
  save action only ever receives plain font files.

  The dropzone is a clearly marked drop target: at rest, a larger box with an upload icon, the
  heading "Drop fonts here", a pale accent fill, and a dashed accent border. While a file drag is
  anywhere over the window (including over the modal), the zone switches to an emphasised state,
  and hovering directly over the zone is the strongest state. This comes from a shared
  window-level file-drag hook, `useWindowFileDrag()` (`src/lib/useWindowFileDrag.ts`, also
  exporting `dropzoneToneClass` for the three visual states), that only reacts to drags carrying
  files (`dataTransfer.types` includes "Files"). During such a drag, everything except the zone
  is blurred: a shared `DropBackdrop` (`src/components/specimen/DropBackdrop.tsx`, a
  pointer-transparent fixed `backdrop-blur-sm` layer) renders as the zone's sibling, and
  `dropzoneToneClass` lifts the zone above it (`relative z-50`, opaque `bg-accent-soft`). Being in
  the zone's own stacking context, this works inside the modal too. While the dropzone is on screen, a file dropped outside it is ignored rather than the
  browser opening or downloading it; text and link drags are unaffected.

  Two buttons sit in the zone: "Choose files or a zip" (reads "Add more files or a zip" once files
  are listed) and "Choose a folder". The folder picker can't open archives: Windows shows a zip as
  a "compressed folder", but a directory picker can't read into it. If a folder pick yields no
  files, a notice says: "Nothing could be read from that folder. To add a .zip, use Choose files or
  a zip, or drop it here."

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
  as a picker. An upload (zip, folder, or loose files) can yield several families, since each
  file's own family name decides its group — a Google Fonts zip gives "Roboto", "Roboto
  Condensed", and so on. The picker lists every detected family with a checkbox, all ticked by
  default; each family lists its variants with parsed weight labels, previewed in its own
  typeface. Individual variants can be unticked, and a family with all its variants unticked
  counts as unticked. Only ticked files are submitted. This client-side parse is preview only —
  the save action re-parses every arriving file with `parseFontFile`, and that server-side parse
  remains the sole authority for family name and weight label.
- **Licence** (required) — one of `LICENCES` (`free`, `personal only`, `commercial`, `unknown`);
  the form defaults to `LICENCES[0]` (`free`) but the hint explicitly tells the user to pick
  `unknown` if unsure rather than leave it unconsidered.
- **Foundry** (optional) — free text.
- **Source** (optional) — a URL, where the font was obtained. When set it must be `http://` or
  `https://`; the save action rejects anything else, before saving any file, with the shared
  `SOURCE_URL_ERROR` ("Source URL must start with http:// or https://.", `src/lib/urls.ts`). The
  detail view renders the link only when `safeHttpUrl` accepts the stored value (otherwise "—").

**Submit button.** It reads "Save Font" for one ticked family and "Save N fonts" for several, and
is disabled when nothing is ticked. While saving, progress shows as "Saving 2 of 3…". The disable
is powered by an optional `disabled` prop on `SubmitButton`
(`src/components/specimen/FormField.tsx`, shared with the screens and palettes forms).

**50 MB check.** `NewFontForm` applies the 50 MB limit per family, matching
`next.config.ts`'s per-request `experimental.serverActions.bodySizeLimit` (each family is its own
request). A family whose ticked variants exceed it is flagged by name and blocked; only
over-limit families are blocked, so a large multi-family zip works as long as each family fits.
Exceeding the framework limit would otherwise fail with an opaque framework error rather than a
readable message.

**Saving several families.** Each ticked family becomes its own font entry, saved through its own
server-action call, one after another. The shared licence, foundry, and source fields apply to
every family in the batch.
- **Partial failure:** families already saved stay saved. Failed families stay in the picker with
  their error so they can be retried, and the form doesn't navigate away while anything has
  failed. A shared-field error, such as an invalid source URL, is shown once rather than per
  family.
  Saved files (tracked by object identity, `savedFiles`) are hidden from the picker, so if more
  files are later added for an already-saved family, it reappears with only the new, unsaved files;
  saved files still appear in the dropzone's own file list. When the identical error comes back for
  several families, the single form-level message ends with "(not saved: A, B)". An unexpected
  thrown error shows its own message (with a generic fallback), mentioning the upload size limit
  only when the message points at the request body being too large.
- **Picker state across changes:** adding or removing files re-detects families but keeps existing
  unticks for families and variants that still exist; newly detected families default to ticked.
  Ticking a variant of an unticked family re-ticks the family, so the checkboxes always match what
  will be saved.
- **Guards:** a ref-based in-flight guard blocks a second submit while a batch runs; after a fully
  successful batch the form stays locked ("Saved, opening grid…") until navigation lands, so it
  can't be re-submitted. A `beforeunload` warning is active while saving. Closing the modal mid-save
  doesn't abort: the remaining sequential calls finish, but nothing updates the unmounted form and
  no navigation fires — so failures after such a close aren't shown anywhere (accepted trade-off;
  the shared `Modal` close behaviour is unchanged).
- **Full success:** the form calls `router.replace("/fonts")` in both contexts; the action has
  already revalidated `/fonts`, so the grid shows the new entries. In the modal this replaces the
  intercepted `/fonts/new` entry, the `@modal` slot falls back to its null page, and the modal
  closes over the fresh grid; on the full page it simply lands on the grid. `replace` (not
  `router.back()`) keeps the form out of history and works on a direct page load.
- **Over-limit families** are excluded from the batch and named in the warning; the button count
  covers only the families that will actually be saved.
- The whole form is disabled (`<fieldset disabled>`) while a batch is saving.

The family name and each file's weight label are never typed by the user — both are parsed
directly from the font file itself via `parseFontFile` (`src/lib/font-parse.ts`, built on
`fontkit`): family name from the font's family/postscript name; weight label from the variable
`wght` axis range if present (`"Variable, {min}–{max}"`), else the OS/2 `usWeightClass` mapped to a
named weight (e.g. `"700 · Bold"`, falling back to nearest known weight if the class is
nonstandard), else `"Regular"` if no weight class is present at all — with `" Italic"` appended
when the subfamily name indicates italic/oblique and the weight label doesn't already say so.

The save Server Action, `saveFontFamily(formData): Promise<SaveFontResult>`
(`src/app/fonts/new/actions.ts`, `SaveFontResult = { ok: true } | { ok: false; error: string }`),
saves one family per call and returns a result instead of redirecting; it is the only font save
path, and calls `revalidatePath("/fonts")` on success. Every rule applies per call: files present,
accepted formats, licence, parse, source URL, and the same-family rule. It requires every uploaded file to parse to the *same* family
name (case-insensitively) — mixed families in one call fail with an error naming the distinct
families found. The UI never sends mixed families, since it submits one family per call, so the
rule is satisfied by construction; the server still enforces it. On success: the first parsed file
becomes the `fonts` primary row (`file_path`/`weights` columns) and every additional file becomes
a `font_files` row. Files are saved under `public/uploads/fonts/<uuid>.<ext>`.

Saving is self-cleaning on failure: file writes and the two DB inserts (`fonts`, then each
`font_files` row) are wrapped in `try`/`catch`, the DB inserts run inside `BEGIN`/`COMMIT`/
`ROLLBACK` as one transaction, and if anything fails partway — a write, or the transaction — every
file already written for that call is unlinked before the error result is returned. No file is
left on disk without a matching row, on a failed save any more than on a delete.

On success, the action calls `revalidatePath` for `/fonts` so the grid reflects the new font
immediately, without a hard refresh — see "Refresh after create, update, or delete" in
`docs/features/screens.md` for why this is needed.

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
`font_files` entries, via `fs.rm` with `force: true`. Confirmed via `ConfirmButton`, then calls
`revalidatePath` for `/fonts` before redirecting to `/fonts` — see "Refresh after create, update, or
delete" in `docs/features/screens.md`.

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
  every font; search and the licence filter narrow it, never gate it.
- **Family name and weight label are always parsed from the file, never user-entered.** The add
  form has no text input for either — this is a deliberate accuracy constraint (a font's own
  metadata is authoritative), not a missing field.
- **One entry per family, not one merged entry.** An upload with several families (e.g. "Roboto"
  and "Roboto Condensed") saves each as its own entry. Each entry has one family name and one
  sample; merging would mislabel families like "Roboto Condensed" as "Roboto" and break search by
  the real family name.
- **Renderability is an intake gate.** The library only accepts formats a browser can actually
  `@font-face` (`.ttf`/`.otf`/`.woff`/`.woff2`) — an entry that can't render its own name in its own
  typeface has no reason to exist. This is why `.ttc`, though fontkit can parse it, is rejected: it
  would save cleanly but display in a fallback system font, silently defeating the feature.
- **No orphaned files, on either side of the write.** Delete removes files from disk, not just DB
  rows — every variant file (primary and all `font_files`) is unlinked from
  `public/uploads/fonts/` on deletion. The same guarantee runs in reverse on save: if the save
  action fails partway through writing files or the DB transaction, every file already written for
  that call is unlinked before the error is returned, so a failed save leaves nothing behind
  either.
- **Licence has no non-answer default worth trusting** — the field is required, and the hint
  explicitly steers an unsure user to the honest `unknown` value rather than leaving it blank.
