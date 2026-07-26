import { readJsonl } from "./jsonl.js";
import { isBeyondFence } from "./models.js";
import { checkSubagents } from "./checks/subagents.js";
import { checkModelChange } from "./checks/modelChange.js";
import { checkPlanMode } from "./checks/planMode.js";
import { degradeBeyondFence } from "./render.js";
import type { Report } from "./render.js";
import type { Finding, SessionRef } from "./types.js";

/**
 * Tek oturumun tam denetimi: model sayimi, uc kontrol, surum citi.
 * CLI'dan ayri tutulur ki citin fiilen uygulandigi test edilebilsin.
 *
 * Cit iki durumda kapanir ve tum bulgular unverifiable'a duser:
 * - beyondFence: oturum, dogrulanan son CC surumunden yeni.
 * - versionsUnknown: kayitlarin hicbirinde surum alani yok. Kanit yoklugu
 *   "guvenli" sayilmaz; o da dogrulanamayan bir formattir.
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
  const beyondFence = versionList.some(isBeyondFence);
  if (beyondFence || versionsUnknown) findings = degradeBeyondFence(findings);

  return {
    slug: session.slug,
    sessionId: session.sessionId,
    usedFallback,
    versions: versionList,
    versionsUnknown,
    beyondFence,
    modelTotals,
    findings,
  };
}
