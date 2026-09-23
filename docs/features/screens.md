# UI Screens (`/screens`)

A curated library of saved UI screenshots/recordings ("specimens"), each tagged with a page type,
layout pattern, verdict (love/hate), optional reasoning, optional code snippet, and free-form tags.

## Routes

- `GET /screens` — browse/search grid (`src/app/screens/page.tsx`)
- `GET /screens/new` — add form, full page or modal depending on navigation (see below)
  (`src/app/screens/new/page.tsx`)
- `GET /screens/[id]` — detail view, full page or modal depending on navigation (see below)
- `GET /screens/[id]/edit` — edit form, full page or modal depending on navigation (see below),
  reached from the Edit link on the detail view (`src/app/screens/[id]/edit/page.tsx`)
- `GET /api/image-proxy?url=…` — same-origin proxy that fetches a remote image server-side so the
  colour picker's canvas reads aren't CORS-tainted (`src/app/api/image-proxy/route.ts`, see
  "Colours" below)

## Browse grid (`/screens`)

Browse-first: the grid always renders every specimen by default (`ORDER BY id DESC`); search and
filters narrow the result set, they never gate it (Constitution Rule 002). `dynamic =
"force-dynamic"` — the page reads the DB on every request, no static caching.

Search (`q`) matches against `why`, `page_type`, `layout_pattern`, or any linked tag name, all via
`LIKE %q%`. Additional filters: `page_type`, `layout_pattern`, `verdict`, each validated against
the fixed vocabularies in `src/lib/constants.ts` (`PAGE_TYPES`, `LAYOUT_PATTERNS`, `VERDICTS`)
before being applied — an unrecognized value is silently ignored rather than erroring.

Each grid card (`SpecimenPlate`) shows the image or video (object-cover, top-aligned), its
`page_type` and `layout_pattern` as specs, its tags, and a verdict stamp. Clicking a card navigates
to `/screens/[id]`.

Search and the filter dropdowns are client-driven, via the shared `IndexBar`/`FilterSelect`
components (`src/components/specimen/IndexBar.tsx`): typing in the search field debounces 300ms
before updating the URL's `q` query param via `router.replace` (`scroll: false`), which this
`force-dynamic` Server Component then re-renders against — no Enter or submit needed, and the
`<form>`'s native submit is suppressed so it can't fire a duplicate navigation on top of the
debounced one. Selecting a filter dropdown (`page_type`, `layout_pattern`, `verdict`) applies
immediately, same mechanism, no debounce. `palettes` and `fonts` use the same shared components for
their own search/filter bars; this is the reference explanation for all three.

## Add form (`/screens/new`)

The fields and their behavior live in a shared component, `NewScreenForm`
(`src/app/screens/new/NewScreenForm.tsx`), used both by the full-page route (`src/app/screens/new/page.tsx`)
and by the modal case of `@modal/(.)[id]/page.tsx` described below — same form, just wrapped
differently depending on how it was reached. `NewScreenForm` also powers the edit form (see "Edit
form" below) via a `mode` prop (`"create"` | `"edit"`, default `"create"`), an `initial` prop
(`ScreenInitialValues`, the screen's current row + tags) supplied only in edit mode, and a
`linkedPaletteId` prop (edit mode only) that swaps the colour picker for a link to the screen's
existing palette when one is already linked. In edit mode the form's action is `updateScreen` bound
to the screen's id; in create mode it's `createScreen`.

Field values themselves — reading `page_type`/`layout_pattern`/`verdict`/`why`/`snippet`/
`snippet_lang`/`source_url`/`tags` off the submitted `FormData` and validating the three closed
vocabularies — are handled by shared helpers in `src/lib/screen-form.ts`
(`readScreenFormValues`, `parseTagNames`, `upsertTagIds`), used by both `createScreen` and
`updateScreen` so the two Server Actions can't drift on what counts as valid.

Fields:
- **Specimen** (required) — image or video, captured via `UploadDropzone`
  (`src/app/screens/new/UploadDropzone.tsx`): manual file picker, clipboard paste, or
  drag-and-drop. A browser-tab drag typically hands over an image URL (e.g. a Pinterest CDN link)
  rather than file bytes; that URL is captured into a hidden `dragged_url` field and fetched
  server-side in the Server Action (`saveUploadFromUrl` in `src/lib/uploads.ts`), since server-side
  fetches aren't subject to CORS. Uploaded files are saved under
  `public/uploads/screens/<uuid>.<ext>`. `UploadDropzone` reports every change in the current
  specimen — new file, dragged URL, or a switch between image/video — via an `onSpecimenChange`
  callback carrying the media type and an `extractSrc`: a CORS-safe src for the colour picker's
  canvas reads (the local `blob:` preview or the existing same-origin file for a same-origin
  image, or a same-origin `/api/image-proxy` URL for a dragged remote one; `null` for video). An
  `existingPreview` prop (edit mode only) seeds the dropzone with the screen's current file/media
  type so it shows by default until replaced.
- **Page type** (required) — one of `PAGE_TYPES` (fixed vocabulary, rendered as a `<select>`, never
  free text).
- **Layout pattern** (required) — one of `LAYOUT_PATTERNS`, same treatment.
- **Verdict** (required) — `love` or `hate` (`VERDICTS`), via `VerdictField`
  (`src/components/specimen/FormField.tsx`), two stamp-styled radio choices rather than a dropdown.
  Its `defaultValue` prop is what lets the edit form come up pre-selected on the screen's current
  verdict.
- **Why** (optional) — a one-line free-text reason. Deliberately optional, not required — see
  "Deviations" below.
- **Code snippet** (optional) — free text, paired with an optional **Language** select (`css` /
  `js` / blank).
- **Source URL** (optional) — most saved specimens won't have one; that's expected, not an error
  state.
- **Tags** (optional) — comma-separated; each tag is lowercased, deduped, and upserted into the
  shared `tags` table. The input offers a preset list (`PRESET_TAGS` in `src/lib/constants.ts`)
  plus autocomplete against every tag name already in the DB, but typing a new one is just as valid
  — presets are a suggestion list only, never a closed set.

### Colours (image specimens only)

When the specimen is an image, the add form shows a Colours section; video specimens get no colour
UI at all.

- On selecting an image, up to 5 dominant colours are auto-extracted client-side — no server
  round-trip, no dependency — via a shared client component (`src/components/specimen/ColourPicker.tsx`)
  that downsamples the image onto a canvas and runs a hand-written median-cut colour quantizer
  (`src/lib/extractColours.ts`): `extractDominantColours` recursively splits the widest-range colour
  box on its median channel until there are enough boxes, averages each into a swatch, and dedupes
  near-identical results by Euclidean RGB distance before returning the top 5, most-to-least
  prominent. `samplePixelColour` and `sampleRectDominantColour` (same file) back the two manual
  picking modes below.
- Each extracted colour renders as a removable chip (a swatch with an `×` to drop it).
- Colours can also be added manually from an enlarged preview of the image, two ways: dragging the
  pointer over the preview shows a magnifier loupe of the pixel under the cursor and adds that
  pixel's colour on release (`samplePixelColour`); or, in select-area mode, dragging a rectangle over
  the preview adds that rectangle's dominant colour (`sampleRectDominantColour`, a single-box
  median-cut). Both are built on pointer events, so they work with mouse or touch input alike. The
  loupe's size and vertical offset above the pointer are driven by CSS custom properties in
  `src/app/globals.css` — `--size-loupe` (via the `.loupe-size` utility class) and
  `--loupe-offset-y` (via `.loupe-position`) — rather than hardcoded pixel values in the component.
- A "Save colours as palette" checkbox, checked by default. While checked, at least 2 colours are
  required — the submit button is disabled with an inline note explaining why, and the same minimum
  is re-validated server-side in `createScreen`. Unchecking it skips palette creation entirely,
  regardless of how many colours are picked.
- **Colour cap.** A palette can hold at most `MAX_PALETTE_COLOURS` (8, `src/lib/constants.ts`)
  colours — shared with the manual palette form on `/palettes/new` (see `docs/features/palettes.md`).
  Auto-extraction is trimmed to the cap client-side; once at the cap, both "Pick colour" and "Select
  area" modes are disabled and a note explains why, so no more colours can be added until one is
  removed. The cap is re-enforced server-side in `parseSavePaletteRequest`
  (`src/lib/palettes.ts`), which rejects a submission carrying more than 8 `palette_hex` values.
- Swapping the specimen — a new file, a newly dragged URL, or switching to a video — clears the
  current colour list immediately, before re-extraction runs against the new image. This prevents
  the hidden `palette_hex` inputs from momentarily (or, if submitted quickly enough, actually)
  carrying the previous image's colours. The submit button stays disabled (fewer than 2 colours)
  until extraction repopulates the list, when "Save colours as palette" is checked.
- For specimens saved from a dragged URL, the browser would treat the loaded image as CORS-tainted
  and block canvas pixel reads, so the preview used for extraction/picking loads through a
  same-origin proxy route, `GET /api/image-proxy?url=…` (`src/app/api/image-proxy/route.ts`) —
  used only to serve that preview, not for the file that actually gets saved. The proxy accepts only
  `http:`/`https:` URLs, requires the upstream response's `Content-Type` to start with `image/`
  (else `415`), and caps the response at 15 MB: it rejects upfront via `Content-Length` when that
  header is present and already over the cap, and also aborts the upstream stream (`413`) the moment
  the actual bytes read exceed 15 MB, since `Content-Length` can be absent or wrong.

All fields are re-validated server-side in `createScreen` (`src/app/screens/new/actions.ts`) even
though the form also marks some as HTML-required, since client-side `required` can't be trusted
alone. When "Save colours as palette" is checked, `createScreen` also creates a `palettes` row for
the new screen (`createPaletteFromHexes`, `src/lib/palettes.ts`): an internal generated name (same
convention as `/palettes/new`, see `docs/features/palettes.md`), each colour saved with its name set
to its own hex and role `any`, `position` in picked order, the screen's own tags copied into
`palette_tags`, and `source_screen_id` set to the new screen's id. The screen insert, its tag links,
and the palette creation all run inside one transaction (`BEGIN`/`COMMIT`/`ROLLBACK`), so a screen
never ends up saved with a half-created or missing companion palette. Before redirecting,
`createScreen` calls `revalidatePath` for `/screens` (and `/palettes` when a palette was created) so
the grid and browse pages reflect the change immediately — see "Refresh after create, update, or
delete" below. On success, redirects to `/screens`.

## Detail view (`/screens/[id]`)

Shared content component `ScreenDetail` (`src/app/screens/[id]/ScreenDetail.tsx`) renders, in
order: page type as heading + plate number + verdict stamp, the media itself, a page
type/layout pattern pair, the `why` text (only if non-empty), tags (only if any), source URL link
(only if set), code snippet with a copy-to-clipboard button (only if set), links to any palettes
created from this screen (via `source_screen_id`, only if any exist), an Edit link to
`/screens/[id]/edit`, and a delete action.

Deleting (`deleteScreen`, an inline Server Action inside `ScreenDetail`) is a hard, immediate delete:
removes the `ui_screens` row, then removes its media file from disk via the shared `deleteUpload`
helper (`src/lib/uploads.ts`) — no soft-delete/archive, the library is meant to stay curated by
actively removing what no longer earns its place, not just accumulate. `deleteUpload(filePath,
subdir)` only unlinks a path that actually lives under `public/uploads/<subdir>/` (a safety check
before touching the filesystem) and silently ignores an already-missing file (`fs.rm` with `force:
true`, errors swallowed) rather than failing the delete; it's shared with `updateScreen`'s
replaced-media cleanup (see "Edit form" below) and with `deleteComponent`
(`docs/features/components.md`) — fonts have long done the equivalent themselves (see
`docs/features/fonts.md`), and now all three media-owning routes clean up the same way. Deleting a
screen does not delete any palette created from it: `source_screen_id` on that palette is
simply set to `NULL` (see `docs/features/palettes.md`). Confirmed via a native confirm dialog
(`ConfirmButton`), then calls `revalidatePath` for `/screens` and, for every palette that was linked
to this screen (queried before the delete, since the delete nulls the link), `/palettes/[id]` — so
that palette's "From screen #N" link disappears from its own cached detail page too — before
redirecting to `/screens`. See "Refresh after create, update, or delete" below.

## Edit form (`/screens/[id]/edit`)

Reached from the Edit link on the detail view. Like the add form and detail view, it renders
full-page on direct load (`src/app/screens/[id]/edit/page.tsx`) and as a modal when reached by
clicking through from the detail view (an intercepting route under `@modal`,
`src/app/screens/@modal/(.)[id]/edit/page.tsx`) — see "Modal-on-click..." below. Both routes load
their initial data through one shared helper, `loadEditScreenInitial`
(`src/app/screens/[id]/edit/loadInitial.ts`): the screen row, its tag names (plus every tag name in
the DB, for autocomplete), and the id of any palette already linked via `source_screen_id`. Either
route renders `NewScreenForm` with `mode="edit"`, the loaded `initial` values, and `linkedPaletteId`
— the full-page route unwrapped, the modal route wrapped in `Modal`.

The edit form reuses `NewScreenForm` (see "Add form" above for its `mode`/`initial`/
`linkedPaletteId` props), prefilled with the screen's current values; every field is editable, and
tags are relinked on save (existing links replaced with whatever the form submits, via the same
upsert-or-ignore-then-link mechanism `createScreen` uses, both now living in `src/lib/screen-form.ts`).

Media: keeping the existing file is the default — resubmitting without touching the Specimen field
leaves `file_path`/`media_type` unchanged. Providing a new file (upload, paste, or drag) replaces
it: the new file is saved and the row updated to point at it, and the previous file is deleted from
disk only after the update transaction commits, via the same shared `deleteUpload` helper
`deleteScreen` uses (see "Detail view" above).

Colours on edit: if the screen already has a palette linked via `source_screen_id`, the form shows
a link to that palette instead of the colour picker — palettes aren't editable from here. If the
screen has no linked palette, the same colour picker and "Save colours as palette" checkbox from
the add form appear, and saving can create and link a new palette exactly as `createScreen` does
(via the same `createPaletteFromHexes` helper). `updateScreen` only accepts a "save colours as
palette" submission at all when the screen has no linked palette yet — otherwise the request is
ignored server-side regardless of what the form submits, since a linked palette isn't replaceable
from here.

The Server Action, `updateScreen` (`src/app/screens/[id]/edit/actions.ts`), re-runs the same
validation `createScreen` does for every field via the shared `src/lib/screen-form.ts` helpers. The
row update, the tag relink, and any new palette creation all run inside one transaction
(`BEGIN`/`COMMIT`/`ROLLBACK`); the old media file (if replaced) is only deleted from disk after that
transaction commits successfully. Before redirecting, it calls `revalidatePath` for `/screens` and
`/screens/[id]`, plus `/palettes` if a new palette was created — see "Refresh after create, update,
or delete" below. On success, redirects to `/screens/[id]`.

`ScreenDetail` is reused, unmodified, by both the full-page route and the modal route described
below — same data, same markup, just wrapped differently by each caller.

## Modal-on-click vs full-page-on-direct-load

All four route trees (`screens`, `palettes`, `fonts`, `components`) share one pattern for showing a
detail view as an in-place modal when reached by clicking a grid card, while still rendering a real
full page at the same URL when loaded directly (hard refresh, external link, or opening the URL in
a new tab). This is implemented once per route tree using Next.js App Router parallel routes +
intercepting routes; `screens` is the reference implementation, `palettes`, `fonts`, and `components`
mirror it exactly.

Structure under `src/app/screens/`:

- **`layout.tsx`** — renders `{children}{modal}` side by side. `children` is the normal route
  subtree (`page.tsx`, `[id]/page.tsx`, `new/page.tsx`); `modal` is the `@modal` parallel slot.
  Because both render simultaneously, the grid (`children`) stays mounted underneath whatever the
  `@modal` slot produces.
- **`[id]/page.tsx`** — the real detail page, rendered as `children` for any direct/non-intercepted
  navigation to `/screens/[id]` (hard refresh, external link, new tab). Renders `ScreenDetail`
  directly, unwrapped, inside a centered `max-w-3xl` container.
- **`[id]/edit/page.tsx`** — the real edit page, rendered as `children` for any
  direct/non-intercepted navigation to `/screens/[id]/edit`. Loads its data via
  `loadEditScreenInitial` and renders `NewScreenForm` prefilled with the screen's current values,
  unwrapped.
- **`@modal/(.)[id]/page.tsx`** — the intercepting route. The `(.)` convention intercepts
  same-level client-side navigation to `[id]` and renders it into the `@modal` slot instead of
  replacing `children`. Next.js's interception matcher wins for *any* single path segment on
  client-side nav, including the literal segment `new` — this component handles that on purpose:
  it checks `id === "new"` first and, if so, renders `NewScreenForm` wrapped in `Modal`, i.e. the
  add-specimen form opens as a modal over the grid. For every other `id`, it renders `ScreenDetail`
  wrapped in `Modal`. Either way, this only fires for a client-side `<Link>` transition that
  originates from a sibling route already inside this layout (i.e. from the grid) — a hard refresh
  or direct load of `/screens/5` or `/screens/new` never goes through it, and lands on the real
  `[id]/page.tsx` or `new/page.tsx` instead.
- **`@modal/(.)[id]/edit/page.tsx`** — the same interception, one segment deeper, for a
  client-side nav from the detail view's Edit link to `/screens/[id]/edit`: loads the same data via
  `loadEditScreenInitial` and renders `NewScreenForm` (prefilled) wrapped in `Modal` into the
  `@modal` slot instead of replacing `children`. A hard refresh or direct load of `/screens/5/edit`
  never goes through it, and lands on the real `[id]/edit/page.tsx` instead.
- **`@modal/default.tsx`** — what the `@modal` slot renders for any path Next.js doesn't have a
  more specific match for (the fallback for a parallel slot when no interception applies). Renders
  `null`, so the modal slot contributes nothing to the tree for most navigations.
- **`@modal/page.tsx`** — a static match for the exact index route (`/screens`) within the `@modal`
  slot. Renders `null`, so navigating back to the plain index (closing the modal, or the grid's own
  search/filter form resubmitting to `/screens`) resolves the slot to nothing instead of leaving
  stale modal state mounted.
- **`@modal/[...catchAll]/page.tsx`** — a static catch-all for every other path under `/screens`
  that isn't the exact index and isn't intercepted by `(.)[id]`. Renders `null`, for the same
  "don't leave the previous modal content behind" reason.

So, per path, the `@modal` slot resolves to one of five cases: the exact index (`@modal/page.tsx`,
null), a real detail id intercepted client-side (`@modal/(.)[id]/page.tsx`, `ScreenDetail` in
`Modal`), the literal `new` segment intercepted client-side (same file, `id === "new"` branch,
`NewScreenForm` in `Modal`), a client-side nav to `[id]/edit` intercepted one segment deeper
(`@modal/(.)[id]/edit/page.tsx`, `NewScreenForm` prefilled, in `Modal`), or anything else
(`@modal/[...catchAll]/page.tsx`, null). There is no `@modal/new/page.tsx` — an earlier attempt at a
static route for that segment turned out to never even get compiled by Next.js, since the
intercepting route unconditionally wins over a static sibling for a single path segment; the
`id === "new"` branch inside `(.)[id]/page.tsx` is the fix that actually works, and turns what was a
bug into an intentional modal-on-click UX for the add forms too, matching how detail rows already
behaved.

`Modal` itself (`src/components/specimen/Modal.tsx`) is a client component shared by all four
route trees: closing always calls `router.back()` — never a hardcoded route — so the grid's
current search/filter query params survive. It's built on `@radix-ui/react-dialog`
(`Dialog.Root`/`Portal`/`Overlay`/`Content`/`Close`, always rendered `open`, with `onOpenChange`
driving the `router.back()` call) rather than hand-rolled Escape-key, backdrop-click, and
body-scroll-lock logic. Radix was chosen over shadcn's generated Dialog specifically because
shadcn's version assumes its own `--background`/`--foreground` CSS-variable convention, which would
conflict with this app's existing token system in `globals.css`; raw Radix is unstyled and is wired
directly to the existing tokens with no visual change. As a result, closing on Escape, on a
backdrop click, and via a visible close button, along with focus trapping, focus restore on close,
and ARIA dialog semantics, are all handled by Radix rather than by this component.

## Refresh after create, update, or delete

Because the grid (`children`) stays mounted underneath the `@modal` slot for the whole
modal-on-click lifetime described above, the client router cache would otherwise keep serving the
stale grid after a save, edit, or delete instead of reflecting the change — a hard refresh would be
needed to see it. To avoid that, every create, update, and delete Server Action across all four
route trees (`createScreen`, `updateScreen`, `deleteScreen` here; the equivalent actions under
`/palettes`, `/fonts`, `/components`) calls Next.js's `revalidatePath` for its own index route and
for the affected item's detail path before redirecting. `/screens` is the reference explanation;
`/palettes`, `/fonts`, and `/components` do the same for their own routes. Where a create/update/
delete on one route tree also affects a *different* route's cached page, that page is revalidated
too: `deleteScreen` also revalidates every linked palette's `/palettes/[id]` (its "From screen #N"
link would otherwise still show on a stale cached page), and `deletePalette` also revalidates its
source screen's `/screens/[id]` (see `docs/features/palettes.md`).

## Data shape

`ui_screens` table (`src/lib/db.ts`):

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `media_type` | TEXT | `image` \| `video`, derived from the uploaded file's extension |
| `file_path` | TEXT | public URL path under `/uploads/screens/` — local-only, gitignored, per Constitution Rule 004 |
| `page_type` | TEXT | one of `PAGE_TYPES` |
| `layout_pattern` | TEXT | one of `LAYOUT_PATTERNS` |
| `verdict` | TEXT | `love` \| `hate` |
| `why` | TEXT NOT NULL | optional in the UI; stored as `""` when left blank, never NULL |
| `snippet` | TEXT, nullable | |
| `snippet_lang` | TEXT, nullable | `css` \| `js` \| unset |
| `source_url` | TEXT, nullable | |
| `created_at` | TEXT | default `datetime('now')` |

Tags are many-to-many via `tags` (shared across the whole app, not screens-specific) and the join
table `ui_screen_tags`, cascade-deleting on either side.

## Deliberate deviations from generic CRUD

- **Browse-first landing, not search-first.** Per Constitution Rule 002, the grid always shows
  every specimen; search/filters narrow it, they never gate it behind an empty initial state.
- **`why` is optional, not required.** Also Rule 002. The form hints that "a save with a reason
  ages better" but does not enforce it, client-side or server-side.
- **Hard delete, no archive.** Deletion is immediate and irreversible (behind a confirm dialog) —
  treated as a real, load-bearing feature of keeping the library curated, not an afterthought.
- **Page type and layout pattern are closed vocabularies**, not free text, specifically so they
  don't rot into inconsistent near-duplicates the way freeform tags could.
- **No orphaned files on delete.** Deleting a screen removes its media file from disk, not just the
  `ui_screens` row, via the shared `deleteUpload` helper — the same guarantee fonts and components
  now provide (see `docs/features/fonts.md`, `docs/features/components.md`).
