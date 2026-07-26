# Changelog

## 0.3.0 — 2026-07-27

- **The output is in English.** Every finding, warning, label and help line
  used to be Turkish written without its diacritics — unreadable to the
  audience the package actually has, and not correct Turkish either. Nothing
  about the checks changed; the words did. Code comments and test names went
  with them, so a contributor can read the repository too.
- **The summary line no longer over-claims.** Collapsed `ok` findings were
  summarised as "declared model matches the one served", but that sentence is
  only true of the subagent check; explained model changes and the plan-mode
  check are folded into the same count. It now says `N findings raised
  nothing` and describes none of them wrongly.
- `1 turn` is no longer printed as `1 turns`.

Four defects found by an adversarial review of this release, all present in
0.2.0, all of them the same over-claim this version was cut to remove:

- **An unreadable version string walked straight through the version fence.**
  `compareVersions` parses each segment with `|| 0`, so `banana`, `v2.2.0`,
  `2.1.abc` and `""` all compared as `0.0.0` — below the fence — and the audit
  proceeded at full confidence, reporting `modelsServedVerified: true` on a
  transcript format it had never seen. A missing version already closed the
  fence; a version that cannot be read is less evidence than a missing one,
  not more. It now closes the fence too, and says which string it could not
  read. `versionFence` in the JSON report gains `unreadableVersions` and
  `closed`.
- **`plan-mode` reported `ok` when there was no execution phase at all.** A
  session conducted entirely in plan mode has nothing to compare against, so
  it is `unverifiable`, not "nothing wrong here".
- **`plan-mode` compared the two sides for set equality, and so missed partial
  overlap.** With plan on `{fable-5}` and execution on `{fable-5, opus-4-8}`,
  the sets differ, so the old check said `ok` — while fable-5 had in fact
  served both sides and the plan-mode boundary had separated nothing. That is
  precisely the condition the check exists to report. It now flags any shared
  model, and names it. This fires on the session in the README.
- **`slugForCwd` did not implement Claude Code's real encoding.** It replaced
  only `\`, `/` and `:`; the actual rule replaces every non-alphanumeric
  character (`C:\Users\you\.claude` is stored as `C--Users-you--claude`). Any
  project path containing a dot, a space or a non-ASCII letter missed its own
  directory, and a bare `routeledger` silently audited the newest session of
  an unrelated project instead.

Also: `CHANGELOG.md` ships in the package, `--sessions` help says that it lists
15, and the unused `description` field was dropped from the subagent metadata
type so that nothing user-derived sits within reach of a finding.

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
