# UI Components (`/components`)

A library of saved reusable UI components (buttons, cards, nav patterns, etc.), each with a
specimen (image/video), a component type (closed vocabulary), optional source code, optional
link, and optional free-form tags.

## Routes

- `GET /components` — browse/search grid (`src/app/components/page.tsx`)
- `GET /components/new` — add form, full page or modal depending on navigation (see below)
- `GET /components/[id]` — detail view, full page or modal depending on navigation (see below)

## Modal-on-click vs full-page-on-direct-load

Uses the same `@modal` parallel-slot + intercepting-route pattern as `/screens` — see
`docs/features/screens.md` for the full explanation. The route tree under `src/app/components/`
mirrors it exactly: `layout.tsx` renders `{children}{modal}`; `[id]/page.tsx` is the real detail
page and `new/page.tsx` the real add-form page, both for direct/non-intercepted loads;
`@modal/(.)[id]/page.tsx` intercepts client-side nav from the grid and, for a real id, wraps
`ComponentDetail` in `Modal`, or, when `id === "new"` (a client-side nav to `/components/new`),
wraps `NewComponentForm` in `Modal` instead; `@modal/default.tsx`, `@modal/page.tsx`, and
`@modal/[...catchAll]/page.tsx` are `null`-rendering placeholders that keep the modal slot from
holding stale content on other navigations.

## Browse grid (`/components`)

Browse-first: the grid always renders every component (`ORDER BY id DESC`) by default; search and
filters narrow it, they never gate it (Constitution Rule 002). `dynamic = "force-dynamic"`.

Search (`q`) matches against `name`, `component_type`, or any linked tag name, via `LIKE %q%`. A
`component_type` filter (`FilterSelect`, options = `COMPONENT_TYPES`) narrows further. Search and
the filter are client-driven and instant — 300ms debounce on search, immediate on filter change —
via the same shared `IndexBar`/`FilterSelect` components `/screens` uses; see
`docs/features/screens.md` for the mechanism.

Each grid card (`SpecimenPlate`) shows the media, the component's `name` as title, its
`component_type` as spec, and its tags. No verdict stamp — components carry no love/hate
judgment, unlike screens.

## Add form (`/components/new`)

The form is a shared component, `NewComponentForm` (`src/app/components/new/NewComponentForm.tsx`),
used both by the full-page route and by the modal case of `@modal/(.)[id]/page.tsx` described
above — same form, just wrapped differently depending on how it was reached.

Fields:
- **Name** (required) — free text, e.g. "Primary Button", "Pricing Card".
- **Preview** (required) — image or video, captured via `UploadDropzone`: manual file picker,
  clipboard paste, drag-and-drop, with the dragged-URL-fetched-server-side fallback for
  browser-tab drags — same mechanism as `/screens`' Specimen field; see `docs/features/screens.md`
  for the `dragged_url`/`saveUploadFromUrl` explanation. Files saved under
  `public/uploads/components/`.
- **Component type** (required) — one of `COMPONENT_TYPES` (fixed vocabulary, `<select>`, never
  free text): `button`, `card`, `nav`, `form`, `modal`, `table`, `input`, `badge`, `tooltip`,
  `dropdown`, `pagination`, `tabs`, `accordion`, `toast`, `loader`, `avatar`, `other`.
- **Source code** (optional) — free text, paired with an optional **Language** select — same
  free-text-plus-language-select treatment as `/screens`' code snippet field, except the Language
  options here are wider — `css` / `js` / `jsx` / `tsx` / blank, vs. `/screens`' `css` / `js` /
  blank — since component snippets are commonly JSX/TSX.
- **Link** (optional) — most saved components won't have one; that's expected, not an error state.
- **Tags** (optional) — same comma-separated/preset/autocomplete mechanism as `/screens` and
  `/palettes` (see `docs/features/screens.md`), writing through the same shared `tags` table.

All fields are re-validated server-side in `createComponent`
(`src/app/components/new/actions.ts`). Before redirecting, it calls `revalidatePath` for
`/components` so the grid reflects the new component immediately, without a hard refresh — see
"Refresh after create, update, or delete" in `docs/features/screens.md` for why this is needed. On
success, redirects to `/components`.

## Detail view (`/components/[id]`)

Shared content component `ComponentDetail` (`src/app/components/[id]/ComponentDetail.tsx`)
renders, in order: name as heading + plate number, the media, the component type, tags (only if
any), link (only if set), source code with copy-to-clipboard (only if set), and a delete action.

Deleting (`deleteComponent`) is a hard, immediate delete: removes the `ui_components` row, then
removes its media file from disk via the shared `deleteUpload` helper (`src/lib/uploads.ts`,
`deleteUpload(filePath, "components")`) — no soft-delete/archive, same "actively curated, not just
accumulated" rationale as `/screens`. `deleteUpload` only unlinks a path under
`public/uploads/components/` and silently ignores an already-missing file; it's the same helper
`deleteScreen`/`updateScreen` use (see `docs/features/screens.md`) — fonts have long done the
equivalent themselves (see `docs/features/fonts.md`), and now all three media-owning routes clean up
the same way. Confirmed via `ConfirmButton`, then calls `revalidatePath` for `/components` before
redirecting to `/components` — see "Refresh after create, update, or delete" in
`docs/features/screens.md`.

## Data shape

`ui_components` table (`src/lib/db.ts`):

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT NOT NULL | |
| `component_type` | TEXT NOT NULL | one of `COMPONENT_TYPES` |
| `media_type` | TEXT | `image` \| `video`, derived from the uploaded file's extension |
| `file_path` | TEXT | public URL path under `/uploads/components/` — local-only, gitignored, per Constitution Rule 004 |
| `snippet` | TEXT, nullable | |
| `snippet_lang` | TEXT, nullable | `css` \| `js` \| `jsx` \| `tsx` \| unset |
| `source_url` | TEXT, nullable | |
| `created_at` | TEXT | default `datetime('now')` |

`ui_component_tags` table:

| column | type | notes |
|---|---|---|
| `component_id` | INTEGER | FK → `ui_components.id`, `ON DELETE CASCADE`, part of composite PK |
| `tag_id` | INTEGER | FK → `tags.id`, `ON DELETE CASCADE`, part of composite PK |

Tags are many-to-many via `tags` (shared across the whole app, the same table `/screens` and
`/palettes` write to) and this join table, cascade-deleting on either side — a tag typed on any of
the three forms is visible as an existing/autocomplete option on the others.

## Deliberate deviations from generic CRUD

- **Browse-first landing, not search-first.** Per Constitution Rule 002, the grid always shows
  every component; search/filters narrow it, never gate it.
- **No verdict/love-hate judgment, unlike `/screens`.** This is a reference library of patterns to
  reuse, not a curated love-or-reject journal.
- **Component type is a closed vocabulary, not free text**, for the same reason `/screens`' page
  type and layout pattern are — so it doesn't rot into inconsistent near-duplicates the way free
  tags could.
- **Hard delete, no archive.** Same rationale as `/screens`.
- **No orphaned files on delete.** Deleting a component removes its media file from disk, not just
  the `ui_components` row, via the shared `deleteUpload` helper — the same guarantee screens and
  fonts provide (see `docs/features/screens.md`, `docs/features/fonts.md`).
