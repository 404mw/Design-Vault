# Constitution

Hard, binding rules for this repo — they override any other instruction, human or AI. A rule
changes in exactly one way: edit it here directly; otherwise rescope the task to fit it as written.
No silent workarounds — no special-cased code, no escape hatches, no "fix it later" TODOs. If
neither fits, stop and raise it. This file describes current rules only, not their history — don't
log a change, just make it. Rules append below as they're added.

## Rule 001 — CSS token enforcement

No hardcoded design values in code (colors, fonts, spacing, radius, borders, shadows). Every value
resolves to a token in `src/app/globals.css` — add one there first if it doesn't exist, then use
it. Tailwind arbitrary values (`bg-[#fff]`, `text-[13px]`) are forbidden.

Exception: contexts that can't read CSS custom properties (Next.js `metadata`, JS color math) may
hold a literal only as a byte-for-byte mirror of a token, commented with that token's name.

## Rule 002 — Browse-first landing, optional "why"

Every route (`/screens`, `/palettes`, `/fonts`) shows its grid by default; search/filters narrow
it, never gate it. The "why" field on a UI screen is optional, not required. Both are deliberate —
don't silently revert either.

## Rule 003 — Planning authority

Order: constitution > user > agent. The agent proposes; the user approves — the agent has no final
say. If the agent is confident the user's request is wrong, push back at least twice before
deferring. If both are unsure, resolve it with available tools (skills, MCPs, docs, web search)
before answering — return with facts, not a guess.

## Rule 004 — Vault data stays local

This repo is published open-source for others to self-host; the maintainer runs no hosted
instance, and every deployment's saved data belongs to that deployment alone. Nothing a user saves
through `/screens`, `/palettes`, or `/fonts` may enter the repository: `data/vault.db` and
everything under `public/uploads/` — screen media, font binaries, all of it — is local-only and
gitignored. No sample or fixture vault data is committed either. Font binaries in particular carry
licences (`personal only`, `unknown`) that make committing them to a public repo a redistribution
problem, not just a tidiness one.
