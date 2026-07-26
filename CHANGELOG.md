# Changelog

## 0.2.0 — 2026-07-26

- **The version fence now does what the README promised.** On a Claude Code
  version newer than the last one routeledger was verified against, every
  finding is degraded to `unverifiable`. Previously only a notice was printed
  while `mismatch`/`ok` labels survived — an assertion the tool had no right
  to make on an unverified format. The withdrawn claim is kept in the detail
  line so you can see what would have been asserted. The fence also closes
  when no Claude Code version was recorded at all: absence of evidence is
  treated as unverifiable, not as safe. And it covers the models-served
  table, which is labeled as a raw, unverified count while the fence is
  closed. Proven end to end: `tests/audit.test.ts` runs the same fixture
  through a verified and an unverified version and watches the finding flip.
- A subagent `meta.json` that fails to parse now yields an `unverifiable`
  finding instead of being silently skipped, and so does a `meta.json` whose
  transcript is missing. Silence read as "fine"; it isn't.
- `--json`: machine-readable report. Always includes every finding. Also
  works with `--sessions`.
- `--sessions`: list the most recent sessions, newest first, to pick an id.
- `--version`.
- CI on GitHub Actions: Windows + Ubuntu, Node 20 and 22.

## 0.1.1 — 2026-07-26

- `repository`/`homepage`/`bugs` metadata in `package.json`. No code change.

## 0.1.0 — 2026-07-26

- First release: three checks (subagent declared-vs-served model, in-session
  model changes, plan-mode profile), version fence, severity-ordered report,
  `--all`.
