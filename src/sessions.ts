import { readdirSync, statSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { SessionRef } from "./types.js";

export function projectsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

/** Claude Code cwd'yi dizin adina bu kuralla kodluyor (2026-07-26'da olculdu). */
export function slugForCwd(cwd: string): string {
  return cwd.replace(/[\\/:]/g, "-");
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

/** Butun slug'lardaki tum oturumlar. root testlerde enjekte edilebilir. */
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
 * Once cwd'den turetilen slug denenir; o dizin yoksa tum slug'lar taranir.
 * Hangisinin kullanildigi cagirana bildirilir ki rapor durust kalsin.
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
 * Oturumu kimligiyle bulur. Tam eslesme oncelikli; yoksa onek eslesmesi
 * kabul edilir, boylece kisa kimlik yazmak yeter. Birden fazla onek
 * eslesmesi varsa en son degisen secilir.
 */
export function findSessionById(sessionId: string, root: string = projectsRoot()): SessionRef | null {
  const all = allSessions(root);
  const exact = all.filter((s) => s.sessionId === sessionId);
  const pool = exact.length > 0 ? exact : all.filter((s) => s.sessionId.startsWith(sessionId));
  if (pool.length === 0) return null;
  pool.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return pool[0]!;
}
