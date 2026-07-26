import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readJsonl } from "../jsonl.js";
import { familyOfDeclared, familyOfModelId } from "../models.js";
import type { Finding } from "../types.js";

/** Only the two fields this check compares. meta.json also carries a
 *  caller-supplied task description; it is deliberately not modelled here,
 *  so there is nothing user-derived within reach of a finding. */
interface Meta {
  agentType?: string;
  model?: string;
}

async function servedModels(jsonlPath: string): Promise<string[]> {
  const seen = new Set<string>();
  for await (const rec of readJsonl(jsonlPath)) {
    const msg = rec["message"];
    if (typeof msg === "object" && msg !== null) {
      const model = (msg as Record<string, unknown>)["model"];
      if (typeof model === "string" && model !== "<synthetic>") seen.add(model);
    }
  }
  return [...seen];
}

/**
 * The flag check: compares the model DECLARED in meta.json with the model
 * that actually SERVED the agent's own transcript.
 */
export async function checkSubagents(subagentDir: string): Promise<Finding[]> {
  if (!existsSync(subagentDir)) return [];
  const findings: Finding[] = [];

  for (const name of readdirSync(subagentDir)) {
    if (!name.endsWith(".meta.json")) continue;
    const agentId = name.slice(0, -".meta.json".length);
    const jsonlPath = join(subagentDir, `${agentId}.jsonl`);

    let meta: Meta;
    try {
      meta = JSON.parse(readFileSync(join(subagentDir, name), "utf8")) as Meta;
    } catch {
      // No silent skip: a declaration that cannot be read is itself a finding.
      findings.push({
        check: "subagent-model",
        status: "unverifiable",
        title: `${agentId} (unknown type)`,
        detail: "meta.json unreadable or invalid JSON; declared model unknown",
      });
      continue;
    }

    if (!existsSync(jsonlPath)) {
      // A declaration with no transcript is not passed over in silence either.
      findings.push({
        check: "subagent-model",
        status: "unverifiable",
        title: `${agentId} (${meta.agentType ?? "unknown"})`,
        detail: "meta.json exists but the agent transcript does not; served model unknown",
      });
      continue;
    }

    const served = await servedModels(jsonlPath);
    const agentType = meta.agentType ?? "unknown";
    const declared = typeof meta.model === "string" ? meta.model : null;

    if (served.length === 0) {
      findings.push({
        check: "subagent-model",
        status: "unverifiable",
        title: `${agentId} (${agentType})`,
        detail: "the agent transcript records no model at all",
      });
      continue;
    }

    if (declared === null) {
      findings.push({
        check: "subagent-model",
        status: "unverifiable",
        title: `${agentId} (${agentType})`,
        detail: `no declared model; served: ${served.join(", ")}`,
      });
      continue;
    }

    const want = familyOfDeclared(declared);
    const got = served.map(familyOfModelId);
    const allMatch = want !== "unknown" && got.every((f) => f === want);

    findings.push({
      check: "subagent-model",
      status: want === "unknown" ? "unverifiable" : allMatch ? "ok" : "mismatch",
      title: `${agentId} (${agentType})`,
      detail: `declared: ${declared} -> served: ${served.join(", ")}`,
    });
  }

  return findings;
}
