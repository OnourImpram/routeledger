#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { allSessions, findLatestSession, findSessionById } from "./sessions.js";
import { auditSession } from "./audit.js";
import { render, renderJson } from "./render.js";

const USAGE = `routeledger — hangi model fiilen cevap verdi

  routeledger               en son oturumu denetler
  routeledger <session-id>  belirtilen oturumu denetler (onek yeter)
  --sessions                en son oturumlari listeler (kimlik secmek icin)
  --all                     uyumlu bulgulari da tek tek yazar
  --json                    ciktiyi JSON basar (--sessions ile de calisir;
                            raporda daima tum bulgular yer alir)
  --version                 surumu basar

Salt okunur. Aga cikmaz, hicbir dosyaya yazmaz.
`;

function ownVersion(): string {
  const pkg = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  ) as { version: string };
  return pkg.version;
}

function listSessions(asJson: boolean): void {
  const all = allSessions().sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, 15);
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
    process.stdout.write("routeledger: ~/.claude/projects altinda oturum bulunamadi.\n");
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
      process.stderr.write(`routeledger: "${arg}" ile eslesen oturum yok.\n`);
      process.exitCode = 1;
      return;
    }
    session = byId;
  } else {
    const found = findLatestSession(process.cwd());
    if (found === null) {
      process.stdout.write("routeledger: ~/.claude/projects altinda oturum bulunamadi.\n");
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
