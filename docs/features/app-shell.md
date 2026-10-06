# App shell, theme, and shared browse components

The visual and structural layer shared by all four browse panels (`/screens`, `/palettes`,
`/fonts`, `/components`): theme tokens, type, top nav, page header, search/filter bar, the card, and
the masonry grid. Per-panel behaviour (data, search, forms, detail views) lives in each panel's own
doc; this doc covers what they share.

## Theme and tokens (`src/app/globals.css`)

Light theme (`color-scheme: light`). Colour token names are stable so a dark set can later be added
as a second set of values for the same names; there is no theme toggle yet.

- Colours: `--paper`, `--paper-raised`, `--paper-deep`, `--ink`, `--ink-soft`, `--ink-faint`
  (`#666a82`, chosen to clear 4.5:1 on both `--paper-raised` and `--paper-deep` for small text), `--line`, `--line-strong`, `--accent` (purple),
  `--accent-soft` (pale purple tint used for icon tiles), `--scrim` (modal backdrop, used as
  `bg-scrim`).
- Shape and shadow: `--radius-card` (1rem), `--radius-control` (0.75rem), `--radius-sample` (inset
  sample rounding), `--shadow-card`, `--shadow-card-hover`, `--border-width-nav-active` (2px).
- Sizing: `--max-h-plate-media` (28rem), `--h-palette-strip` (6rem, palette card colour strip),
  `--size-swatch-dot` (0.875rem, palette card colour-list dot), `--min-h-font-sample` (12rem),
  `--size-icon-tile` (2.5rem), `--size-icon-tile-lg` (3.5rem, page header), `--size-icon`,
  `--size-icon-lg`, `--max-w-page-description`, `--size-stamp-sm` (2.25rem), `--size-stamp-md`
  (2.5rem), `--border-width-stamp` (1.5px, the verdict stamp's ring border and cross stroke).
- Utility classes exposing these: `.max-h-plate-media`, `.h-palette-strip`, `.size-swatch-dot`, `.min-h-font-sample`,
  `.size-icon-tile`, `.size-icon-tile-lg`, `.max-w-page-description`, `.size-stamp-sm`,
  `.size-stamp-md`, `.column-span-all` (`column-span: all`). The verdict stamp's label is never
  smaller than `--text-3xs`.

Per Constitution Rule 001, every value used in components resolves to a token. `viewport.themeColor`
in `src/app/layout.tsx` mirrors `--paper` byte-for-byte (a comment there says so; the two must be
changed together).

Detail views, forms, and the modal are not redesigned; they inherit the tokens and fonts only.

## Type

Inter, loaded via `next/font/google` (`--font-inter`), is the single sans, exposed as the
`--font-sans` token. Spline Sans Mono (`--font-spline-mono`) is kept for code and `.catalog-number`,
exposed as `--font-mono`. Both tokens are mapped in `@theme inline`, giving the `font-sans` and
`font-mono` utilities.
`.catalog-label` is the small tracked-uppercase label style, set in the sans; `.catalog-number`
is coloured with `--ink-faint`. Both live in `@layer components`, so Tailwind utilities placed
alongside them (`tracking-*`, `font-*`, `text-*`) override their defaults. Unlayered CSS would beat
Tailwind v4's layered utilities and make such overrides silently do nothing.

## Cursors

Tailwind v4's preflight leaves buttons with the default cursor, so `globals.css` has an
`@layer base` rule giving `cursor: pointer` to interactive elements: links with `href`, buttons,
`[role=button]`, selects, summaries, `label[for]`, labels wrapping a checkbox/radio/file/color
input (via `label:has(...)`), and checkbox/radio/color/file/submit/button inputs. Labels wrapping
text inputs keep the default cursor. Their disabled and `aria-disabled` states get `cursor: not-allowed`. Because the rule is
layered, `cursor-*` utilities override it. A few clickable elements the selector list can't catch
(e.g. drop zones) carry `cursor-pointer` individually.

## Nav (`src/components/specimen/CatalogNav.tsx`)

A plain-text "Design Vault" wordmark with a "UI SCREENS & ASSETS" tagline, then four two-line items
(label over subtitle): Screens / Gallery, Palettes / Colors, Fonts / Type, Components / UI Kit. The
active item is in the accent colour with an underline bar (`--border-width-nav-active`). The
wordmark links to `/screens`. There is deliberately no Home item (`/`
redirects to `/screens`; the app is browse-first per Constitution Rule 002) and no logo asset.

## Page header (`PageHeader.tsx`)

A shared component rendered at the top of each browse page: icon tile, title, and a one-line
description. Icons come from `lucide-react`, one per panel: Screens `LayoutGrid`, Palettes
`Palette`, Fonts `Type`, Components `Component`. The same icon appears in that panel's card icon
tiles.

## IndexBar / FilterSelect

Restyled: a rounded search field with a leading icon, filter boxes showing a tiny label above the
current value. `IndexBar`/`FilterSelect` props and behaviour are unchanged; see
`docs/features/screens.md` for the debounce/URL mechanism. The solid accent "+ New ..." button is a
separate export from `IndexBar.tsx`, `NewButton({ href, children })`, which each page places as
the last child of `IndexBar` (the screens button reads "New Screen").

## Cards (`SpecimenPlate`)

A rounded white card with a soft shadow (`--shadow-card`, deepening to `--shadow-card-hover` on
hover). The outer element is a non-interactive box. The link to the item's detail route is a
stretched overlay: an absolutely positioned link covering the whole card, with a focus ring and an
accessible name (`aria-label`): the `linkLabel` prop if given, otherwise title, description and
specs joined with " — ", otherwise "View details". Titles alone repeat across cards (e.g. a screen's
page type), so the default folds in the description and specs to keep names distinguishable;
palettes pass an explicit `linkLabel` listing their hexes. Clicking anywhere on the card opens the
detail route, and the card is a single tab stop. The hover shadow and the "View details →" arrow
nudge are driven by hovering anywhere on the card. Accepted trade-off: because the overlay covers
the content, card text (descriptions, hexes) can't be drag-selected; copy hexes with the palette
copy buttons or from the detail view.

Interactive controls inside a card (the copy buttons on palette, font and component cards, and the
external-link button on component cards) are raised above the overlay, so they work on their own
without navigating. This also avoids invalid nested interactive content (a button inside a link).

Two shared card action components live in `src/components/specimen/`. Both are raised above the
stretched link (`relative z-10`), have a ~24px hit area (the icon stays small), and show a focus
ring:
- **`CardCopyButton`** (named apart from the detail views' local `CopyButton`s), props `{ text, label }`. Built on `useCopy`
  (`src/lib/useCopy.ts`); on click it copies `text`, swaps its icon for a check for 1.5s, and a
  polite live region announces "Copied". It never navigates. Palette, font and component cards use
  it.
- **`CardLinkButton`**, props `{ href, label }`. A real `<a target="_blank" rel="noopener
  noreferrer">` with an `ArrowUpRight` icon; opens `href` in a new tab.

Contents, top to bottom:
- an inset sample (media, font specimen, or colour strip) with its own rounding; where a verdict
  exists it is a small badge on the media corner;
- icon tile plus title (optional, rendered exactly as passed; no CSS case transform, so names
  like "iA Writer" survive. `/screens` upper-cases the first letter of `page_type` itself). The
  icon tile is hidden when there is no title/description/specs beside it;
- specs (optional), a small tracked line under the title;
- description (optional, clamped to about 2 lines);
- an optional slot between the heading and the tags, for panel-specific detail content (palette
  cards put their colour list here, font cards their font-family and variant rows, component cards
  their snippet/link rows; screen cards don't use it);
- up to 3 tag pills, then "+N" for the remainder;
- footer: calendar icon and date, plus a "View details →" affordance. The affordance is a `span`,
  not a nested link. The date is rendered by `LocalDate`
  (`src/components/specimen/LocalDate.tsx`, a client component). It parses SQLite's UTC
  `created_at` and formats it in the viewer's own timezone, e.g. "Sep 12, 2026". This is so an
  evening save west of UTC doesn't show tomorrow's date. The server render uses the server's
  timezone and the client may correct it at hydration, so the element carries
  `suppressHydrationWarning`.

Props: `href`, `sample`, `icon`, `title?`, `description?`, `specs?`, `tags?`, `verdict?`,
`createdAt?` (the raw `created_at` string), `linkLabel?` (overrides the overlay link's accessible
name), `children?` (the optional between-heading-and-tags
slot).

## Masonry grid (`PlateGrid`)

`PlateGrid({ children })` is a CSS multi-column container (`columns-1 gap-6 sm:columns-2
lg:columns-3`), identical on all four panels. Cards are `mb-6 break-inside-avoid`. Media renders at
its natural aspect ratio, capped at `--max-h-plate-media` and cropped from the top beyond the cap.
`EmptyPlate` sits inside the column container and spans all columns via `.column-span-all`.

## Deviations and accepted trade-offs

- **Column-first ordering.** Multi-column fills down each column first, so the newest items run
  down column 1 rather than across the top row.
- **Layout shift as images load.** Image dimensions aren't stored, so natural-ratio media can shift
  the layout as it loads.
- **No Home nav item and no logo asset**, as above.
- **No theme toggle yet**; the token structure only leaves room for a dark set.
