# Changelog

## Unreleased

- **Verified on Claude Code 2.1.325** (was 2.1.220). On every newer version
  the fence had closed and each finding fell to `unverifiable`, so the tool
  said nothing about a current session. The fields the checks read were
  looked for in 80 real sessions written by 2.1.226 to 2.1.325. The report of
  76 of them (the other four were still being written) was compared with an
  independent reading of the same files: versions, model counts, the
  plan-mode finding, model changes and 1,659 subagent findings agreed in all
  76. The comparison was then run against three deliberately broken builds
  and inputs, and reported each one.
- **The Mythos family is recognised.** A model id beginning `claude-mythos-`
  mapped to `unknown`, so a subagent declared with one was `unverifiable`
  whatever served it.
- **Agents launched by a workflow run are checked.** Claude Code stores them
  one level below the subagent directory (`subagents/workflows/<run>/`), and
  a flat listing passed over them in silence. In the sessions read, 689 of
  1,715 declarations lived there. They are found now and named by where
  they live.
- **The plan-mode boundary is placed where the mode changed.** The check
  read the mode from user turns alone. Approving a plan leaves plan mode in
  the middle of a turn, so the turns that executed the plan were counted as
  plan-mode turns until the next prompt, and turns in a plan mode entered
  mid-turn were counted as execution. The mode-change records the session
  writes are read as well now, whichever record came last. Measured on the
  29 sessions with a plan-mode turn (2.1.81 to 2.1.325): the mode-change
  record left plan mode within two assistant records of the last
  `ExitPlanMode` call 22 times out of 29; the user turn did so once out of
  25, and was more than ten records late 21 times. On 4 of the 28 sessions
  compared the old reading gives a different verdict. A session with no
  mode-change record is read as before.
- **One unreadable project directory no longer stops everything.** A
  directory under `~/.claude/projects` that could not be listed threw out of
  the scan: no listing, no lookup by id, no audit. It is skipped now and
  named on stderr.

Not released to npm. The package version is unchanged.

## 0.3.1 - 2026-07-27

- The repository now carries a `CITATION.cff`, so GitHub renders a "Cite this
  repository" entry and the software archive has metadata to mint a DOI from.
- The README opens with a banner that shows a real finding before the prose.

No behaviour change. Nothing in the checks, the output or the CLI moved. This
release exists so the archived record has a version to point at.

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
