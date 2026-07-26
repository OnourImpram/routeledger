import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { readJsonl } from "../jsonl.js";
import { familyOfDeclared, familyOfModelId } from "../models.js";
import type { Finding } from "../types.js";

interface Meta {
  agentType?: string;
  description?: string;
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
 * Bayrak kontrol: meta.json'daki BEYAN edilen model ile ajanin kendi
 * transcript'indeki FIILEN kosan modeli karsilastirir.
 */
export async function checkSubagents(subagentDir: string): Promise<Finding[]> {
  if (!existsSync(subagentDir)) return [];
  const findings: Finding[] = [];

  for (const name of readdirSync(subagentDir)) {
    if (!name.endsWith(".meta.json")) continue;
    const agentId = name.slice(0, -".meta.json".length);
    const jsonlPath = join(subagentDir, `${agentId}.jsonl`);
    if (!existsSync(jsonlPath)) continue;

    let meta: Meta;
    try {
      meta = JSON.parse(readFileSync(join(subagentDir, name), "utf8")) as Meta;
    } catch {
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
        detail: "ajanin transcript'inde hicbir model kaydi yok",
      });
      continue;
    }

    if (declared === null) {
      findings.push({
        check: "subagent-model",
        status: "unverifiable",
        title: `${agentId} (${agentType})`,
        detail: `beyan edilen model yok; fiilen: ${served.join(", ")}`,
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
      detail: `beyan: ${declared} -> fiilen: ${served.join(", ")}`,
    });
  }

  return findings;
}
