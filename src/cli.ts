#!/usr/bin/env node
import { findLatestSession, findSessionById } from "./sessions.js";
import { readJsonl } from "./jsonl.js";
import { isBeyondFence } from "./models.js";
import { checkSubagents } from "./checks/subagents.js";
import { checkModelChange } from "./checks/modelChange.js";
import { checkPlanMode } from "./checks/planMode.js";
import { render } from "./render.js";
import type { Finding } from "./types.js";

const USAGE = `routeledger — hangi model fiilen cevap verdi

  routeledger               en son oturumu denetler
  routeledger <session-id>  belirtilen oturumu denetler (onek yeter)
  --all                     uyumlu bulgulari da tek tek yazar

Salt okunur. Aga cikmaz, hicbir dosyaya yazmaz.
`;

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(USAGE);
    return;
  }

  const showAll = argv.includes("--all");
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

  const modelTotals: Record<string, number> = {};
  const versions = new Set<string>();
  for await (const rec of readJsonl(session.mainPath)) {
    const v = rec["version"];
    if (typeof v === "string") versions.add(v);
    if (rec["type"] !== "assistant") continue;
    const msg = rec["message"];
    if (typeof msg !== "object" || msg === null) continue;
    const model = (msg as Record<string, unknown>)["model"];
    if (typeof model !== "string" || model === "<synthetic>") continue;
    modelTotals[model] = (modelTotals[model] ?? 0) + 1;
  }

  const findings: Finding[] = [
    ...(await checkSubagents(session.subagentDir)),
    ...(await checkModelChange(session.mainPath)),
    await checkPlanMode(session.mainPath),
  ];

  const versionList = [...versions].sort();
  process.stdout.write(
    render({
      slug: session.slug,
      sessionId: session.sessionId,
      usedFallback,
      versions: versionList,
      beyondFence: versionList.some(isBeyondFence),
      modelTotals,
      findings,
      showAll,
    })
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`routeledger: ${String(err)}\n`);
  process.exitCode = 1;
});
