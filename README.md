# Design Vault

A local-first reference library for the design work you keep losing track of: UI screens, reusable
components, colour palettes and font files. It runs on your own machine and nothing you save
leaves it.

A moodboard saves the picture. It does not save why you kept it, so the board grows and stops
being useful. This saves the decision: a screen is filed by page type and layout pattern, with a
verdict on whether you liked it and room for the reason.

## Requirements

- **Node 24 or later.** The database is [`node:sqlite`](https://nodejs.org/api/sqlite.html),
  built into Node itself. There is no `better-sqlite3` and no native module to compile, which is
  what makes this install cleanly on Windows.
- npm, or any package manager you prefer.

## Install

```bash
git clone https://github.com/404mw/Design-Vault.git
cd Design-Vault
npm install
npm run dev
```

Open http://localhost:3000.

There is nothing else to configure. No environment variables, no `.env` file, no external
service. On first run the app creates `data/vault.db` for itself, and creates each upload folder
under `public/uploads/` the first time you save something into it.

Scripts:

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

There is no test suite yet.

## Usage

Four sections, each with its own grid, search box and filters.

**Screens.** Whole pages, saved as an image or a short video for motion. Each one takes a page
type (landing, pricing, settings, dashboard, form, onboarding, empty state, table, auth, error,
docs) and a layout pattern (split, centred, sidebar, bento, card grid, full-bleed, single column),
both from fixed lists rather than free text, so the filters keep working after a hundred saves.
Then a verdict, love or hate, because what you rejected is worth as much as what you kept. A
one-line why and a code snippet are optional.

**Components.** The same idea one level down: buttons, cards, navigation, the pieces you rebuild
on every project. A specimen image or video, a component type from a fixed list, an optional
snippet and source link. No verdict here, this one is for reuse rather than judgement.

**Palettes.** Two colours or more, each with a hex, a name and a role (background, surface, text,
muted, accent, border). The palette page runs a WCAG contrast check across the pairs and shows
what passes AA and AAA, and exports the whole thing as CSS custom properties you can drop into a
project.

**Fonts.** Upload the actual font file. The family name and the available weights are read out of
the file, so you never type them. A licence field is required, free, personal only, commercial or
unknown, because that is the field that matters in a year when a client project ships.

### Getting things in

Three ways, on any section: paste an image straight from the clipboard, drag an image out of a
browser tab, or pick a file. A drag from a browser carries the source URL with it where the
browser provides one. A paste does not, so items captured that way have no link back.

### Finding things again

Every grid shows everything you have saved, newest first. The search box and the filters narrow
it and never gate it, and they work by writing to the URL, so any view you are looking at is a
link you can keep.

## Your data stays local

`data/vault.db` and everything under `public/uploads/` is gitignored and stays on your machine.
There is no hosted instance of this and no account to make. Font binaries in particular carry
licences that would make republishing them someone else's problem, so no sample vault data is
committed to this repo either.

## Contributing

Issues and pull requests are welcome. Two things to read first:

**[`docs/01-CONSTITUTION.md`](docs/01-CONSTITUTION.md)** holds the hard rules this codebase is
built on, covering design tokens, the browse-first landing, planning authority and what may never
be committed. Read it before you open a pull request. A patch that breaks one of those rules gets
sent back, so it is cheaper to read them first.

**[`docs/features/`](docs/features/)** holds a written spec per section. If you are changing
behaviour, that document is the description of what the behaviour is supposed to be, and it
changes in the same pull request as the code.

Run `npm run lint` before opening a PR.

## Licence

MIT. See [LICENSE](LICENSE).
