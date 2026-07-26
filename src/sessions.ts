import { readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionRef } from "./types.js";

export function projectsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * Claude Code encodes the cwd into the directory name by replacing every
 * non-alphanumeric character with a hyphen (measured 2026-07-27 against the
 * directories on disk: `C:\Users\onuri\.claude` is stored as
 * `C--Users-onuri--claude`, and a path containing `düzeltilmiş sürüm` as
 * `d-zeltilmi--s-r-m`). An earlier version replaced only \ / and :, so any
 * project path holding a dot, a space or a non-ASCII letter missed its own
 * directory and silently fell back to another project's newest session.
 */
export function slugForCwd(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

function sessionsInSlug(root: string, slug: string): SessionRef[] {
  const dir = join(root, slug);
  if (!existsSync(dir)) return [];
  const out: SessionRef[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const mainPath = join(dir, name);
    const sessionId = name.slice(0, -".jsonl".length);
    out.push({
      slug,
      sessionId,
      mainPath,
      subagentDir: join(dir, sessionId, "subagents"),
      mtimeMs: statSync(mainPath).mtimeMs,
    });
  }
  return out;
}

/** Every session under every slug. root is injectable for tests. */
export function allSessions(root: string = projectsRoot()): SessionRef[] {
  if (!existsSync(root)) return [];
  const out: SessionRef[] = [];
  for (const slug of readdirSync(root)) {
    if (!statSync(join(root, slug)).isDirectory()) continue;
    out.push(...sessionsInSlug(root, slug));
  }
  return out;
}

/**
 * The slug derived from the cwd is tried first; if that directory does not
 * exist, every slug is scanned. Which one was used is reported back to the
 * caller so that the report stays honest.
 */
export function findLatestSession(
  cwd: string,
  root: string = projectsRoot()
): { session: SessionRef; usedFallback: boolean } | null {
  if (!existsSync(root)) return null;

  const preferred = sessionsInSlug(root, slugForCwd(cwd));
  if (preferred.length > 0) {
    preferred.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return { session: preferred[0]!, usedFallback: false };
  }

  const all = allSessions(root);
  if (all.length === 0) return null;
  all.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return { session: all[0]!, usedFallback: true };
}

/**
 * Finds a session by id. An exact match wins; otherwise a prefix match is
 * accepted, so typing a short id is enough. If several prefixes match, the
 * most recently modified one is chosen.
 */
export function findSessionById(sessionId: string, root: string = projectsRoot()): SessionRef | null {
  const all = allSessions(root);
  const exact = all.filter((s) => s.sessionId === sessionId);
  const pool = exact.length > 0 ? exact : all.filter((s) => s.sessionId.startsWith(sessionId));
  if (pool.length === 0) return null;
  pool.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return pool[0]!;
}
