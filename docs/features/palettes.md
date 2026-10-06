# Palettes (`/palettes`)

A library of saved color palettes. Each palette is a set of named, hex-valued colors with roles
(`any`/background/surface/text/muted/accent/border) and optional free-form tags, browsable as a
grid, checkable for text/background contrast, and exportable as CSS custom properties. A palette is
created either directly through the add form, or automatically from a screen's colours when saving
or editing a screen on `/screens` (see `docs/features/screens.md`).

## Routes

- `GET /palettes` — browse/search grid (`src/app/palettes/page.tsx`)
- `GET /palettes/new` — add form, full page or modal depending on navigation (see below)
  (`src/app/palettes/new/page.tsx`)
- `GET /palettes/[id]` — detail view, full page or modal depending on navigation
- `GET /api/palettes/[id]/export` — downloads the palette as a `.css` custom-properties file

## Modal-on-click vs full-page-on-direct-load

Uses the same `@modal` parallel-slot + intercepting-route pattern as `/screens` — see
`docs/features/screens.md` for the full explanation. The route tree under `src/app/palettes/`
mirrors it exactly: `layout.tsx` renders `{children}{modal}`; `[id]/page.tsx` is the real detail
page and `new/page.tsx` the real add-form page, both for direct/non-intercepted loads;
`@modal/(.)[id]/page.tsx` intercepts client-side nav from the grid and, for a real id, wraps
`PaletteDetail` in `Modal`, or, when `id === "new"` (a client-side nav to `/palettes/new`), wraps
the shared `NewPaletteForm` component in `Modal` instead — so "+ New Palette" opens as a modal over
the grid rather than navigating to a separate page; `@modal/default.tsx`, `@modal/page.tsx`, and
`@modal/[...catchAll]/page.tsx` are `null`-rendering placeholders that keep the modal slot from
holding stale content on other navigations.

## Browse grid (`/palettes`)

Browse-first: the grid always renders every palette (`ORDER BY created_at DESC`) by default;
search narrows it, it never gates it (Constitution Rule 002). `dynamic = "force-dynamic"`.

Palettes carry no user-facing name (see "Deviations" below), so search (`q`) instead matches
against each palette's colors and its tags, via two `LIKE %q%`-driven `EXISTS` subqueries OR'd
together: one over `palette_colors` (a color's `name`, `hex`, or `role`), the other over
`palette_tags` joined to `tags` (a linked tag's `name`).

Search is client-driven and instant: typing debounces ~300ms before updating the URL's `q` query
param, which this `force-dynamic` page re-renders against — no Enter needed (see
`docs/features/screens.md` for the shared `IndexBar` mechanism). `/palettes` has no `FilterSelect`
filter dropdowns, search only.

The page opens with the shared `PageHeader` (`Palette` icon) and uses the same masonry `PlateGrid`
and `SpecimenPlate` card as the other panels (see `docs/features/app-shell.md`). A palette card,
top to bottom:

1. **Sample** — a horizontal colour strip: every colour side by side at equal widths, at a fixed
   height of `--h-palette-strip`. No labels on the strip, and its height doesn't depend on colour
   count.
2. **Heading** — the `Palette` icon tile and the title "{n} colours" (n = the colour count;
   "1 colour" when singular). The
   title is derived, not a stored name (see "Deviations"). The spec line "From screen #N" appears
   only when `source_screen_id` is set; it is plain text, not a link, since the card's
   stretched link already opens the detail route.
3. **Colour list** — passed as `SpecimenPlate`'s `children` (its between-heading-and-tags slot). One compact
   row per colour in `position` order: a small round colour dot (`--size-swatch-dot`, with a subtle
   border so near-white colours stay visible), the colour's name, its hex in mono uppercase, then,
   pushed to the far right, the role as a small muted label (only when the role isn't `any`) and a
   small copy button as the row's last item. When a colour's name equals its hex (as with auto-created palettes), the hex is shown
   once, not twice. This list is what makes card height grow with colour count (2 to 8) in the
   masonry grid.

   The copy button is the shared `CardCopyButton` (`src/components/specimen/CardCopyButton.tsx`; see `docs/features/app-shell.md`), a client component that shares its
   clipboard logic with the detail view's `CopyHex`. Clicking it copies the hex to the clipboard
   and swaps the icon for a check for about 1.5s. Its accessible label is "Copy #HEX", and a polite live region announces "Copied"; the hit
   area is about 24px though the icon stays small. Clipboard logic is the shared `useCopy` hook
   (`src/lib/useCopy.ts`), also used by the detail view's `CopyHex` and the screens/components
   snippet `CopyButton`s. The card's link label is "{n}-colour palette: #HEX, #HEX, …". It does not
   open the detail view: it is raised above the card's stretched link, while clicking anywhere
   else on the row or card still navigates. Each colour adds one tab stop.
4. **Tags** (up to 3, then "+N") and the date / "View details →" footer, as on every card.

## Add form (`/palettes/new`)

The form is a shared component, `NewPaletteForm` (`src/app/palettes/new/NewPaletteForm.tsx`), used
both by the full-page route (`src/app/palettes/new/page.tsx`) and by the modal case of
`@modal/(.)[id]/page.tsx` described above — same form, just wrapped differently depending on how
it was reached.

A single form with a repeatable list of color rows (`PaletteColorRows`, client component), minimum
2 rows enforced in the UI (the "Remove" button disables once only 2 remain). Each row has:

- **Pick** — a native `<input type="color">` swatch picker, kept in sync with the hex text field.
- **Name** (required)
- **Hex** (required) — the visible input holds only the 6 hex digits, with a static `#` shown
  outside the editable box as a prefix; any `#` typed or pasted into the field is stripped
  automatically. The full `#RRGGBB` value is tracked in a hidden `color_hex` field, which is what
  actually gets submitted and is what's pattern-validated (`^#[0-9a-fA-F]{6}$`), full 6-digit only,
  no 3-digit shorthand — this is a purely visual/input change, not a change to the submitted value
  or its validation.
- **Role** — one of `COLOR_ROLES` (`any`, `background`, `surface`, `text`, `muted`, `accent`,
  `border`), defaulting to `any`. No longer marked required in the UI (the `Field` no longer shows
  a required asterisk) — a role value is always present by default, so there's nothing to enforce.
  `any` means "no particular role"; see "Deviations" below for what that means for contrast
  checking.

All rows share field names (`color_name`, `color_hex`, `color_role`) so the server action
(`createPalette`, `src/app/palettes/new/actions.ts`) zips the parallel `FormData.getAll()` arrays
back together by index. A row where every field is blank is treated as an untouched extra row and
skipped; a row with only some fields filled throws a validation error naming the row. Hex is
re-validated server-side against the same 6-digit pattern (`HEX_COLOUR_RE`, `src/lib/palettes.ts`).
At least 2 complete color rows are required, and at most `MAX_PALETTE_COLOURS` (8,
`src/lib/constants.ts`) — the same cap the screen add/edit form's colour picker enforces (see
`docs/features/screens.md`) — or the action throws.

- **Tags** (optional) — same treatment as `/screens`' Tags field (see `docs/features/screens.md`):
  comma-separated, lowercased, deduped, and upserted into the shared `tags` table via the same
  `TagsInput` component and the same `PRESET_TAGS` suggestion list. `createPalette` links them into
  `palette_tags` with the same insert-or-ignore-then-link logic `createScreen` uses for
  `ui_screen_tags`.

Before redirecting, `createPalette` calls `revalidatePath` for `/palettes` so the grid reflects the
new palette immediately, without a hard refresh — see "Refresh after create, update, or delete" in
`docs/features/screens.md` for why this is needed. On success, redirects to `/palettes`.

A palette can also be created without going through this form at all: saving or editing a screen on
`/screens` with "Save colours as palette" checked creates one automatically, via
`createPaletteFromHexes` (`src/lib/palettes.ts`) — the same module `createPalette` shares
`HEX_COLOUR_RE` and `generatePaletteName` with, plus `parseSavePaletteRequest`, which validates the
screen form's colour submission (count and hex format) the same way `createPalette` validates its
own rows. An auto-created palette has no name entered by anyone (same internal generated `name`
every palette gets), each colour's `name` is set to its own hex rather than a chosen name, every
colour's `role` is `any`, and its `source_screen_id` points back at the screen it came from — see
`docs/features/screens.md`.

## Detail view (`/palettes/[id]`)

Shared content component `PaletteDetail` (`src/app/palettes/[id]/PaletteDetail.tsx`) renders:

- A heading (`{n}-Color Palette`), plate number, an **Export tokens (.css)** link to the export
  route, a "From screen #N" link to `/screens/[id]` when `source_screen_id` is set, and a delete
  action.
- **Swatches** — every color as a full-size `CopyHex` card (image, name, hex, role); clicking
  copies the hex to the clipboard.
- **Tags** (only if any) — pill list, same convention as `/screens`' detail view. Shown between
  Swatches and Contrast check.
- **Contrast check** — every `text`-role color paired against every `background`/`surface`-role
  color, each pair's ratio computed via `contrastRatio` and shown with its AA (`Pass` / `Large
  only` / `Fail`) and AAA (`Pass` / `Fail`) result. If the palette has no `text` role or no
  `background`/`surface` role, this section shows an explanatory message instead of an empty table.
  The table's minimum width comes from the `--width-contrast-table` CSS custom property in
  `src/app/globals.css` (via the `.min-w-contrast-table` utility class), so it doesn't compress
  illegibly on narrow viewports.

Deleting (`deletePalette`, `src/app/palettes/[id]/actions.ts`) is a hard `DELETE` on the `palettes`
row; `palette_colors` rows cascade-delete via the schema's `ON DELETE CASCADE` (foreign keys are
enabled globally in `src/lib/db.ts`). Deleting a palette does not touch the screen it was created
from, if any — the relationship only cascades the other way (see "Data shape" below). Confirmed via
`ConfirmButton`, then calls `revalidatePath` for `/palettes` and, if the palette had a
`source_screen_id`, that screen's `/screens/[id]` too (so its "From this screen" palette link
disappears from the cached detail page), before redirecting to `/palettes` — see "Refresh after
create, update, or delete" in `docs/features/screens.md`.

## Export route (`GET /api/palettes/[id]/export`)

Returns the palette's colors as CSS custom properties, one per color: `--color-{role}-{slug}:
{hex};` inside a `:root { }` block, where `{slug}` is the color's name slugified
(lowercased, non-alphanumeric runs collapsed to a single `-`, trimmed of leading/trailing `-`), or
`swatch` if the name slugifies to empty. Served as `text/css` with a `Content-Disposition:
attachment` header, filename `palette-{id}-tokens.css`.

## Data shape

`palettes` table (`src/lib/db.ts`), stored in `data/vault.db` — local-only, gitignored, per
Constitution Rule 004:

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT NOT NULL | internal-only, never shown in the UI — see "Deviations" |
| `source_screen_id` | INTEGER, nullable | FK → `ui_screens.id`, `ON DELETE SET NULL` — set when this palette was auto-created from a screen's colours; `NULL` for palettes created directly through the add form, and also once the source screen is deleted |
| `created_at` | TEXT | default `datetime('now')` |

`source_screen_id` was added via a startup migration in `src/lib/db.ts`: on every connection open, a
`PRAGMA table_info(palettes)` check looks for the column, and only runs `ALTER TABLE ... ADD COLUMN`
if it's missing — so existing databases pick up the column without a manual migration step. Because
Next's build (and dev) can open several connections to the same file concurrently, two connections
can both see the column missing and both attempt the `ALTER TABLE`; the loser's "duplicate column
name" error is caught and ignored (anything else re-throws), and the same connection also sets
`PRAGMA busy_timeout = 5000` so a concurrent writer waits instead of failing immediately with
"database is locked".

`palette_colors` table:

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `palette_id` | INTEGER | FK → `palettes.id`, `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | |
| `hex` | TEXT NOT NULL | `#RRGGBB`, 6-digit only |
| `role` | TEXT NOT NULL | one of `COLOR_ROLES` |
| `position` | INTEGER | display order within the palette |

`palette_tags` table:

| column | type | notes |
|---|---|---|
| `palette_id` | INTEGER | FK → `palettes.id`, `ON DELETE CASCADE`, part of composite PK |
| `tag_id` | INTEGER | FK → `tags.id`, `ON DELETE CASCADE`, part of composite PK |

Tags are many-to-many via `tags` (shared across the whole app, same table `/screens` uses) and this
join table, cascade-deleting on either side.

## Deliberate deviations from generic CRUD

- **Browse-first landing, not search-first.** Per Constitution Rule 002, the grid always shows
  every palette; search narrows it, never gates it.
- **No user-facing palette name.** The form and every display omit a name field entirely; the grid
  card's title is derived ("{n} colours"), and the detail heading is likewise derived
  (`{n}-Color Palette`), not read from `name`. The `name` column still exists and is still `NOT NULL` (a randomly generated
  `palette-{8 random hex chars}` string, written once at creation by `createPalette`) purely
  because the schema requires some string there and the export route's filename logic wants a
  fallback — it is never read back for display anywhere.
- **Contrast checking is a first-class section of the detail view**, not a separate tool — every
  `text` × `background`/`surface` pair in the palette is checked automatically against WCAG AA/AAA.
- **`any` is the default role, and a real "opt out of contrast checking" value, not just a
  placeholder.** Contrast pairing keys off literal role equality (`role === "text"` for the text
  group, `role === "background" || role === "surface"` for the background group), so a color left
  as `any` simply doesn't join either group. A palette where every color is left as `any` isn't an
  error — its Contrast check section just shows the "nothing to check here" message instead of a
  table.
- **Tags reuse the app-wide `tags` table**, the same one `/screens` writes to — a tag typed on
  either form is visible as an existing/autocomplete option on the other.
- **A palette doesn't have to come from the add form.** Saving or editing a screen with "Save
  colours as palette" checked creates one automatically, linked back to that screen via
  `source_screen_id`. Deleting the screen later doesn't delete the palette — the link is just
  cleared (`ON DELETE SET NULL`). An auto-created palette's colours have their `name` set to their
  own hex (nothing else was ever entered for them) and `role` set to `any`.
- **A palette can have at most `MAX_PALETTE_COLOURS` (8) colours**, a shared invariant defined once
  in `src/lib/constants.ts` and enforced on both paths a palette can be created from: `createPalette`
  rejects a manual submission with more than 8 complete color rows, and `parseSavePaletteRequest`
  (`src/lib/palettes.ts`) does the same for the screen-form path, where the client-side `ColourPicker`
  also proactively trims auto-extraction to the cap and disables further picking once at it (see
  `docs/features/screens.md`).
