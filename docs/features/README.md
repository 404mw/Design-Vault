# Feature docs

One file per implemented feature (a route, a subsystem, a user-facing capability) in this repo.
Each file is a snapshot of the current state — what the feature does, its data shape, the decisions
that shaped how it works now — never a log of how it got there. When something changes, the file is
edited to match; whatever it said before is gone once it's no longer true, not kept alongside the
update. `doc-manager` owns keeping these current — see `CLAUDE.md`.

This is the first place to read when gathering context on something already built, before the
actual source.

## Agent guardrail: vault data is protected from tool calls

The repo ships a Claude Code `PreToolUse` hook, `.claude/hooks/protect-vault-data.mjs` (registered
in `.claude/settings.json` against `Bash`/`PowerShell`/`Write`/`Edit`/`NotebookEdit`), that blocks
any agent shell command or file write that would delete, move, or overwrite `data/` (`vault.db`) or
`public/uploads/`, or run `git clean` with an `-x`/`-X` flag (which would wipe those gitignored
paths). This exists to enforce Constitution Rule 004 mechanically, not just by convention — an
agent that genuinely needs one of these paths touched should stop and ask the user to do it
themselves rather than route around the hook.
