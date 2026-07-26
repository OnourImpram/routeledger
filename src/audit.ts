import { readJsonl } from "./jsonl.js";
import { isBeyondFence, isParseableVersion } from "./models.js";
import { checkSubagents } from "./checks/subagents.js";
import { checkModelChange } from "./checks/modelChange.js";
import { checkPlanMode } from "./checks/planMode.js";
import { degradeBeyondFence } from "./render.js";
import type { Report } from "./render.js";
import type { Finding, SessionRef } from "./types.js";

/**
 * A full audit of one session: model counts, three checks, version fence.
 * Kept out of the CLI so that the fence can be tested end to end.
 *
 * The fence closes in three cases, and every finding falls to unverifiable:
 * - beyondFence: the session is newer than the last verified CC version.
 * - versionsUnknown: no record carries a version field. Absence of evidence
 *   is not treated as safe; that is an unverified format too.
 * - unreadableVersions: a version string this tool cannot parse. That is
 *   less evidence than a missing one, not more, so it cannot pass a gate a
 *   missing version fails.
 */
export async function auditSession(session: SessionRef, usedFallback = false): Promise<Report> {
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

  let findings: Finding[] = [
    ...(await checkSubagents(session.subagentDir)),
    ...(await checkModelChange(session.mainPath)),
    await checkPlanMode(session.mainPath),
  ];

  const versionList = [...versions].sort();
  const versionsUnknown = versionList.length === 0;
  const unreadableVersions = versionList.filter((v) => !isParseableVersion(v));
  const beyondFence = versionList.some(isBeyondFence);
  if (beyondFence || versionsUnknown || unreadableVersions.length > 0) {
    findings = degradeBeyondFence(findings);
  }

  return {
    slug: session.slug,
    sessionId: session.sessionId,
    usedFallback,
    versions: versionList,
    versionsUnknown,
    unreadableVersions,
    beyondFence,
    modelTotals,
    findings,
  };
}
