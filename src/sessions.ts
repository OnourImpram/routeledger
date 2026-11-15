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

/**
 * Every session under every slug, and the slugs that could not be read.
 *
 * One project directory that cannot be listed (a permission error, a link
 * whose target is gone) used to throw out of the scan and take every other
 * project down with it: no listing, no lookup by id, nothing. Met 2026-11-15
 * on a directory carried over from another account. Such a directory is
 * skipped and named, so the caller can say what it did not look at.
 */
function scan(root: string): { sessions: SessionRef[]; unreadable: string[] } {
  const sessions: SessionRef[] = [];
  const unreadable: string[] = [];
  if (!existsSync(root)) return { sessions, unreadable };
  for (const slug of readdirSync(root)) {
    try {
      if (!statSync(join(root, slug)).isDirectory()) continue;
      sessions.push(...sessionsInSlug(root, slug));
    } catch {
      unreadable.push(slug);
    }
  }
  return { sessions, unreadable };
}

/** Every session under every readable slug. root is injectable for tests. */
export function allSessions(root: string = projectsRoot()): SessionRef[] {
  return scan(root).sessions;
}

/** The project directories the scan had to skip. Empty when all were read. */
export function unreadableProjects(root: string = projectsRoot()): string[] {
  return scan(root).unreadable;
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

  let preferred: SessionRef[] = [];
  try {
    preferred = sessionsInSlug(root, slugForCwd(cwd));
  } catch {
    // The directory of the cwd itself cannot be read. Fall through to the
    // scan; usedFallback tells the caller the session came from elsewhere.
  }
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
