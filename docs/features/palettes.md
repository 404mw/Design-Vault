# Palettes (`/palettes`)

A library of saved color palettes. Each palette is a set of named, hex-valued colors with roles
(background/surface/text/muted/accent/border), browsable as a grid, checkable for text/background
contrast, and exportable as CSS custom properties.

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
against each palette's colors: any color's `name`, `hex`, or `role`, via `LIKE %q%` against
`palette_colors` in an `EXISTS` subquery.

Each grid card (`SpecimenPlate`) shows the palette's color count as its spec, and a custom `sample`:
a horizontal strip of swatches (one flex segment per color, equal width) — or, once a palette has
more than 3 colors, the per-swatch name label switches to a vertical (rotated -90°) orientation to
keep it legible in a narrower segment. Each swatch renders its own hex as the background, with a
pill-shaped label showing the color's name on top.

### Swatch label contrast (pill/strip)

The label pill's background is picked by `pickPillColor(hex, siblingHexes)`
(`src/lib/contrast.ts`): among the palette's *other* colors (siblings), it always picks whichever
one contrasts best against the swatch's own hex — unconditionally, with no minimum-ratio (AA)
requirement to clear first. It only falls back to `readableTextColor(hex)` (near-black or
near-white, whichever contrasts more) when there are literally no sibling colors to choose from,
which can't currently happen since every palette requires at least 2 colors. The label's own text
color is always the swatch's own hex — so the label visually "belongs" to its swatch (reads in that
color) while sitting on a pill background borrowed from elsewhere in the same palette.

## Add form (`/palettes/new`)

The form is a shared component, `NewPaletteForm` (`src/app/palettes/new/NewPaletteForm.tsx`), used
both by the full-page route (`src/app/palettes/new/page.tsx`) and by the modal case of
`@modal/(.)[id]/page.tsx` described above — same form, just wrapped differently depending on how
it was reached.

A single form with a repeatable list of color rows (`PaletteColorRows`, client component), minimum
2 rows enforced in the UI (the "Remove" button disables once only 2 remain). Each row has:

- **Pick** — a native `<input type="color">` swatch picker, kept in sync with the hex text field.
- **Name** (required)
- **Hex** (required) — pattern-validated client-side (`^#[0-9a-fA-F]{6}$`), full 6-digit only, no
  3-digit shorthand.
- **Role** (required) — one of `COLOR_ROLES` (`background`, `surface`, `text`, `muted`, `accent`,
  `border`).

All rows share field names (`color_name`, `color_hex`, `color_role`) so the server action
(`createPalette`, `src/app/palettes/new/actions.ts`) zips the parallel `FormData.getAll()` arrays
back together by index. A row where every field is blank is treated as an untouched extra row and
skipped; a row with only some fields filled throws a validation error naming the row. Hex is
re-validated server-side against the same 6-digit pattern. At least 2 complete color rows are
required, or the action throws. On success, redirects to `/palettes`.

## Detail view (`/palettes/[id]`)

Shared content component `PaletteDetail` (`src/app/palettes/[id]/PaletteDetail.tsx`) renders:

- A heading (`{n}-Color Palette`), plate number, an **Export tokens (.css)** link to the export
  route, and a delete action.
- **Swatches** — every color as a full-size `CopyHex` card (image, name, hex, role); clicking
  copies the hex to the clipboard.
- **Contrast check** — every `text`-role color paired against every `background`/`surface`-role
  color, each pair's ratio computed via `contrastRatio` and shown with its AA (`Pass` / `Large
  only` / `Fail`) and AAA (`Pass` / `Fail`) result. If the palette has no `text` role or no
  `background`/`surface` role, this section shows an explanatory message instead of an empty table.

Deleting (`deletePalette`, `src/app/palettes/[id]/actions.ts`) is a hard `DELETE` on the `palettes`
row; `palette_colors` rows cascade-delete via the schema's `ON DELETE CASCADE` (foreign keys are
enabled globally in `src/lib/db.ts`). Confirmed via `ConfirmButton`, then redirects to `/palettes`.

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
| `created_at` | TEXT | default `datetime('now')` |

`palette_colors` table:

| column | type | notes |
|---|---|---|
| `id` | INTEGER PK | |
| `palette_id` | INTEGER | FK → `palettes.id`, `ON DELETE CASCADE` |
| `name` | TEXT NOT NULL | |
| `hex` | TEXT NOT NULL | `#RRGGBB`, 6-digit only |
| `role` | TEXT NOT NULL | one of `COLOR_ROLES` |
| `position` | INTEGER | display order within the palette |

## Deliberate deviations from generic CRUD

- **Browse-first landing, not search-first.** Per Constitution Rule 002, the grid always shows
  every palette; search narrows it, never gates it.
- **No user-facing palette name.** The form and every display (grid card, detail view) omit a name
  field entirely. The `name` column still exists and is still `NOT NULL` (a randomly generated
  `palette-{8 random hex chars}` string, written once at creation by `createPalette`) purely
  because the schema requires some string there and the export route's filename logic wants a
  fallback — it is never read back for display anywhere.
- **Swatch labels use a sibling-color pill, not a generic black/white overlay.** `pickPillColor`
  always borrows the best-contrasting other color already in the same palette for the label's
  background, so a palette card visually reads as built entirely from its own colors; it only falls
  back to near-black/near-white when there are no sibling colors at all to pick from.
- **Contrast checking is a first-class section of the detail view**, not a separate tool — every
  `text` × `background`/`surface` pair in the palette is checked automatically against WCAG AA/AAA.
