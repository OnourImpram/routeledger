# routeledger

**Which model actually served each turn of your Claude Code session — and where the routing quietly diverged from what you configured.**

Claude Code picks the model for a turn from a stack of inputs: the `model` setting, the plan-mode boundary, `ANTHROPIC_DEFAULT_*` alias overrides, subagent frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, allowlist substitutions, fallback chains, and automatic safety fallback. Most of them can change what you get **without raising an error**. You keep working; the answers keep coming; the model is not the one you configured.

Your session transcript already recorded what happened. `routeledger` reads it.

```
npx routeledger
```

## What it looks like

Real output, from a real session:

```
routeledger — session da6e9010-343d-4966-a90c-7a7de1af0825
  project: C--Users-onuri-Hezarfen-Vault
  claude code: 2.1.206, 2.1.207, 2.1.211, 2.1.218, 2.1.220

  MODELS SERVED
    claude-opus-4-8                7589 turn
    claude-fable-5                 3662 turn

  FINDINGS
    [OBSERVATION ] aciklanmamis model degisimi
                    claude-fable-5 -> claude-opus-4-8 @ 2026-07-19T15:32:10.329Z
                    cikarim: kullanici eylemi bulunamadi; ancak oturum-ici settings.json
                    duzenlemesi ve resume transcript'e kaydedilmez, dolayisiyla bu bir hipotezdir
    [UNVERIFIABLE] agent-a90c8e85777de7dde (general-purpose)
                    beyan edilen model yok; fiilen: claude-fable-5, claude-opus-4-8
    [OK          ] 21 bulgu uyumlu — beyan edilen model ile fiilen kosan ayni
                    hepsini gormek icin: routeledger --all
```

Two things in that report are invisible everywhere else: a model change nobody asked for, and a single subagent run served by two different models.

## Usage

```
routeledger               audit the most recent session
routeledger <session-id>  audit a specific session (a prefix is enough)
routeledger --all         list matching findings individually instead of summarising them
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

routeledger records the Claude Code version behind every session it reads. On a version newer than the last one it was verified against, it refuses to assert and degrades to `unverifiable`, with a notice. An auditor that is confidently wrong is worse than no auditor.

## Honest limits

- The environment a session ran with — including `ANTHROPIC_DEFAULT_OPUS_MODEL` and friends — is **not recorded anywhere in the transcript**. routeledger therefore cannot prove that an alias remap was intended, or that one silently went missing on resume. It will not guess.
- `unverifiable` is a real answer here and appears often. It means the evidence needed is absent, not that everything is fine.
- Findings describe one session. There is no history, no policy file, and no CI gate in this version.

## Related work

- [`ccusage`](https://github.com/ccusage/ccusage) — what your sessions **cost**, broken down by model. Different question, and the one most people need first.
- [`tylerlaprade/fableplan`](https://github.com/tylerlaprade/fableplan) — **sets up** a Fable-plans / Opus-executes routing. routeledger checks whether the routing you set up is the one you got.

## Why this exists

Silent model substitution is an open, current problem. Claude Code's own tracker carries reports of `opusplan` falling back during plan mode with no signal, of classifier denials rerouting a request to a different model, and of subagent model attribution being displayed incorrectly after a fallback. In every case the work continues and nothing tells you.

The transcript on your disk already contains the answer. This reads it back to you.

## License

MIT
