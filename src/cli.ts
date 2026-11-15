#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { allSessions, findLatestSession, findSessionById, unreadableProjects } from "./sessions.js";
import { auditSession } from "./audit.js";
import { render, renderJson } from "./render.js";

const USAGE = `routeledger — which model actually answered

  routeledger               audit the most recent session
  routeledger <session-id>  audit one session (a prefix is enough)
  --sessions                list the 15 most recent sessions, to pick an id from
  --all                     also list the findings that raised nothing, one by one
  --json                    print the report as JSON (works with --sessions;
                            the JSON report always carries every finding)
  --version                 print the version

Read-only. No network. Writes nothing.
`;

function ownVersion(): string {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  ) as { version: string };
  return pkg.version;
}

/**
 * Says which project directories were skipped. On stderr, so that --json
 * output stays parseable. Called only where the answer depends on the scan:
 * a listing, a lookup that found nothing.
 */
function noteUnreadable(): void {
  const skipped = unreadableProjects();
  if (skipped.length === 0) return;
  const one = skipped.length === 1;
  process.stderr.write(
    `routeledger: ${skipped.length} project ${one ? "directory" : "directories"} could not be read and ` +
      `${one ? "was" : "were"} skipped: ${skipped.join(", ")}\n`
  );
}

function listSessions(asJson: boolean): void {
  const all = allSessions().sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 15);
  noteUnreadable();
  if (asJson) {
    const rows = all.map((s) => ({
      sessionId: s.sessionId,
      modifiedAt: new Date(s.mtimeMs).toISOString(),
      project: s.slug,
    }));
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  if (all.length === 0) {
    process.stdout.write("routeledger: no sessions found under ~/.claude/projects\n");
    return;
  }
  for (const s of all) {
    process.stdout.write(`${s.sessionId}  ${new Date(s.mtimeMs).toISOString()}  ${s.slug}\n`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(USAGE);
    return;
  }
  if (argv.includes("--version") || argv.includes("-v")) {
    process.stdout.write(`routeledger ${ownVersion()}\n`);
    return;
  }

  const showAll = argv.includes("--all");
  const asJson = argv.includes("--json");

  if (argv.includes("--sessions")) {
    listSessions(asJson);
    return;
  }

  const arg = argv.find((a) => !a.startsWith("-"));

  let session;
  let usedFallback = false;

  if (arg !== undefined) {
    const byId = findSessionById(arg);
    if (byId === null) {
      process.stderr.write(`routeledger: no session matches "${arg}"\n`);
      noteUnreadable();
      process.exitCode = 1;
      return;
    }
    session = byId;
  } else {
    const found = findLatestSession(process.cwd());
    if (found === null) {
      process.stdout.write("routeledger: no sessions found under ~/.claude/projects\n");
      noteUnreadable();
      return;
    }
    session = found.session;
    usedFallback = found.usedFallback;
  }

  const report = await auditSession(session, usedFallback);
  process.stdout.write(asJson ? renderJson(report) : render({ ...report, showAll }));
}

main().catch((err: unknown) => {
  process.stderr.write(`routeledger: ${String(err)}\n`);
  process.exitCode = 1;
});
