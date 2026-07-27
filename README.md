<p align="center">
  <img src="https://raw.githubusercontent.com/OnourImpram/routeledger/master/assets/routeledger-banner.png" width="100%" alt="routeledger: which model actually served each turn of your session. A trace of twenty minutes of one real session, 19 July 15:32 to 15:52, shows the routing stepping between Fable 5 and Opus 4.8 three times, two of them marked as having no recorded cause, above a row of 22 subagent runs of which 9 declared no model at all.">
</p>

# routeledger

[![ci](https://github.com/OnourImpram/routeledger/actions/workflows/ci.yml/badge.svg)](https://github.com/OnourImpram/routeledger/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/routeledger)](https://www.npmjs.com/package/routeledger)

**Which model actually served each turn of your Claude Code session — and where the routing quietly diverged from what you configured.**

Claude Code picks the model for a turn from a stack of inputs: the `model` setting, the plan-mode boundary, `ANTHROPIC_DEFAULT_*` alias overrides, subagent frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, allowlist substitutions, fallback chains, and automatic safety fallback. Most of them can change what you get **without raising an error**. You keep working; the answers keep coming; the model is not the one you configured.

Your session transcript already recorded what happened. `routeledger` reads it.

```
npx routeledger
```

## What it looks like

Real output, from a real session (abridged — the full report lists all twelve flagged findings):

```
routeledger — session da6e9010-343d-4966-a90c-7a7de1af0825
  project: C--Users-onuri-Hezarfen-Vault
  claude code: 2.1.206, 2.1.207, 2.1.211, 2.1.218, 2.1.220

  MODELS SERVED
    claude-opus-4-8                7589 turns
    claude-fable-5                 3809 turns

  FINDINGS
    [OBSERVATION ] unexplained model change
                    claude-fable-5 -> claude-opus-4-8 @ 2026-07-19T15:32:10.329Z
                    inference: no user action found; but a mid-session settings.json
                    edit and a resume are not recorded in the transcript, so this is
                    a hypothesis
    [OBSERVATION ] plan-mode profile
                    plan: claude-fable-5 | execution: claude-fable-5, claude-opus-4-8
                    inference: claude-fable-5 served turns on both sides of the
                    plan-mode boundary; if you expected a plan-mode upgrade, it
                    may never have fired. The configuration at session time is not
                    recorded in the transcript, so this is an observation, not a
                    verdict
    [UNVERIFIABLE] agent-a90c8e85777de7dde (general-purpose)
                    no declared model; served: claude-fable-5, claude-opus-4-8
    [OK          ] 20 findings raised nothing
                    to see each of them: routeledger --all
```

Two things in that report are invisible everywhere else: a model change nobody asked for, and a single subagent run served by two different models.

## Usage

```
routeledger               audit the most recent session
routeledger <session-id>  audit a specific session (a prefix is enough)
routeledger --sessions    list recent sessions, newest first, to pick an id from
routeledger --all         list matching findings individually instead of summarising them
routeledger --json        print the report as JSON (always includes every finding)
```

Requires Node 20+ and Claude Code transcripts under `~/.claude/projects`.

## What it checks

**1. Subagent: declared model vs served model.** Every subagent run leaves a `meta.json` recording the model it was asked for, next to a transcript recording the model that answered. routeledger joins them. *Limit:* when `meta.json` declares no model, there is no recorded intent to compare against, so the finding is `unverifiable` — not "fine".

**2. Model changes inside a session.** Walks the served model across the session and separates changes you asked for from changes you did not, by looking for a preceding `/model` command. *Limit:* "no user action found" is an **inference**, not a finding. A mid-session `settings.json` edit and a resume are not recorded in the transcript. routeledger labels this on every such report rather than presenting it as a verdict.

**3. Plan mode profile.** Reports which models served plan-mode turns versus the rest. If they are identical and you expected a plan-mode upgrade, it may not have fired. *Limit:* the configuration in force at session time is not recorded, so this is an observation, never a judgement.

## What it does not do

- **No network.** Ever. There is nothing to configure and nothing to opt out of.
- **Writes nothing.** No files, no cache, no telemetry. Read-only by construction.
- **Changes nothing.** It cannot switch models or touch your configuration.
- **Does not report message content.** Your prompts and Claude's replies are never printed, stored, or transmitted. One narrow exception, stated plainly because "it does not read your content" would be false: check 2 scans user text **in memory** for the `/model` command marker, so it can tell a change you requested from one you did not. That text never enters a finding and never leaves the process.

## Version fence

The Claude Code transcript format is undocumented and it moves. During development a single transcript was found spanning five CLI versions, and a record type present in one session was absent in another.

routeledger records the Claude Code version behind every session it reads. On a version newer than the last one it was verified against — or when no version was recorded at all — it refuses to assert: every finding degrades to `unverifiable` (the withdrawn claim is kept in the detail line), and the models-served table is labeled as a raw, unverified count. An auditor that is confidently wrong is worse than no auditor.

## Honest limits

- The environment a session ran with — `ANTHROPIC_DEFAULT_OPUS_MODEL` and friends — is **not recorded as structured data anywhere in the transcript**. routeledger therefore cannot prove that an alias remap was intended, or that one silently went missing on resume. It will not guess. (Those variable names can turn up inside a transcript as ordinary conversation text, because someone discussed them. That is not a record of the environment, and routeledger does not read it as one.)
- `unverifiable` is a real answer here and appears often. It means the evidence needed is absent, not that everything is fine.
- Findings describe one session. There is no history, no policy file, and no CI-gate mode in this version — findings never change the exit code. (The badge above is this repo's own test suite, not a gating feature.)

## Related work

- [`ccusage`](https://github.com/ccusage/ccusage) — what your sessions **cost**, broken down by model. Different question, and the one most people need first.
- [`tylerlaprade/fableplan`](https://github.com/tylerlaprade/fableplan) — **sets up** a Fable-plans / Opus-executes routing. routeledger checks whether the routing you set up is the one you got.

## Why this exists

Silent model substitution is an open, current problem. Claude Code's own tracker carries reports of `opusplan` falling back during plan mode with no signal, of classifier denials rerouting a request to a different model, and of subagent model attribution being displayed incorrectly after a fallback. In every case the work continues and nothing tells you.

The transcript on your disk already contains the answer. This reads it back to you.

## License

MIT
