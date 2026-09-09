# UI Screens (`/screens`)

A curated library of saved UI screenshots/recordings ("specimens"), each tagged with a page type,
layout pattern, verdict (love/hate), optional reasoning, optional code snippet, and free-form tags.

## Routes

- `GET /screens` — browse/search grid (`src/app/screens/page.tsx`)
- `GET /screens/new` — add form, full page or modal depending on navigation (see below)
  (`src/app/screens/new/page.tsx`)
- `GET /screens/[id]` — detail view, full page or modal depending on navigation (see below)

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
differently depending on how it was reached.

Fields:
- **Specimen** (required) — image or video, captured via `UploadDropzone`: manual file picker,
  clipboard paste, or drag-and-drop. A browser-tab drag typically hands over an image URL (e.g. a
  Pinterest CDN link) rather than file bytes; that URL is captured into a hidden `dragged_url`
  field and fetched server-side in the Server Action (`saveUploadFromUrl` in `src/lib/uploads.ts`),
  since server-side fetches aren't subject to CORS. Uploaded files are saved under
  `public/uploads/screens/<uuid>.<ext>`.
- **Page type** (required) — one of `PAGE_TYPES` (fixed vocabulary, rendered as a `<select>`, never
  free text).
- **Layout pattern** (required) — one of `LAYOUT_PATTERNS`, same treatment.
- **Verdict** (required) — `love` or `hate` (`VERDICTS`).
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

All fields are re-validated server-side in `createScreen` (`src/app/screens/new/actions.ts`) even
though the form also marks some as HTML-required, since client-side `required` can't be trusted
alone. On success, redirects to `/screens`.

## Detail view (`/screens/[id]`)

Shared content component `ScreenDetail` (`src/app/screens/[id]/ScreenDetail.tsx`) renders, in
order: page type as heading + plate number + verdict stamp, the media itself, a page
type/layout pattern pair, the `why` text (only if non-empty), tags (only if any), source URL link
(only if set), code snippet with a copy-to-clipboard button (only if set), and a delete action.

Deleting (`deleteScreen`, an inline Server Action inside `ScreenDetail`) is a hard, immediate
`DELETE` with no soft-delete/archive — the library is meant to stay curated by actively removing
what no longer earns its place, not just accumulate. Confirmed via a native confirm dialog
(`ConfirmButton`), then redirects to `/screens`.

This same `ScreenDetail` component is reused, unmodified, by both the full-page route and the
modal route described below — same data, same markup, just wrapped differently by each caller.

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

So, per path, the `@modal` slot resolves to one of four cases: the exact index (`@modal/page.tsx`,
null), a real detail id intercepted client-side (`@modal/(.)[id]/page.tsx`, `ScreenDetail` in
`Modal`), the literal `new` segment intercepted client-side (same file, `id === "new"` branch,
`NewScreenForm` in `Modal`), or anything else (`@modal/[...catchAll]/page.tsx`, null). There is no
`@modal/new/page.tsx` — an earlier attempt at a static route for that segment turned out to never
even get compiled by Next.js, since the intercepting route unconditionally wins over a static
sibling for a single path segment; the `id === "new"` branch inside `(.)[id]/page.tsx` is the fix
that actually works, and turns what was a bug into an intentional modal-on-click UX for the add
forms too, matching how detail rows already behaved.

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
