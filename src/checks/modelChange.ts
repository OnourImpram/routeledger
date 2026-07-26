import { readJsonl } from "../jsonl.js";
import type { Finding } from "../types.js";

const MODEL_COMMAND = /<command-name>\/model<\/command-name>/;

function userText(rec: Record<string, unknown>): string {
  const msg = rec["message"];
  if (typeof msg !== "object" || msg === null) return "";
  const content = (msg as Record<string, unknown>)["content"];
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) =>
      typeof b === "object" && b !== null && (b as Record<string, unknown>)["type"] === "text"
        ? String((b as Record<string, unknown>)["text"] ?? "")
        : ""
    )
    .join(" ");
}

/**
 * Finds the points where the serving model changed during a session.
 *
 * "No user action" is an INFERENCE: a mid-session settings.json edit or a
 * resume is never written to the transcript. The finding is labeled as such.
 *
 * PRIVACY: this check scans user text in memory for one thing only, the
 * /model marker. The scanned text enters no finding and is written nowhere.
 * The value userText() returns is passed to the MODEL_COMMAND regex, nothing else.
 */
export async function checkModelChange(mainPath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  let current: string | null = null;
  let modelCommandSincePrevious = false;

  for await (const rec of readJsonl(mainPath)) {
    if (rec["type"] === "user" && MODEL_COMMAND.test(userText(rec))) {
      modelCommandSincePrevious = true;
      continue;
    }
    if (rec["type"] !== "assistant") continue;

    const msg = rec["message"];
    if (typeof msg !== "object" || msg === null) continue;
    const model = (msg as Record<string, unknown>)["model"];
    if (typeof model !== "string" || model === "<synthetic>") continue;

    if (current === null) {
      current = model;
      continue;
    }
    if (model === current) continue;

    const ts = typeof rec["timestamp"] === "string" ? rec["timestamp"] : "no timestamp";
    findings.push(
      modelCommandSincePrevious
        ? {
            check: "model-change",
            status: "ok",
            title: "model change (explained)",
            detail: `${current} -> ${model} @ ${ts}; a /model command precedes it`,
          }
        : {
            check: "model-change",
            status: "observation",
            title: "unexplained model change",
            detail: `${current} -> ${model} @ ${ts}`,
            inference:
              "no user action found; but a mid-session settings.json edit and a resume are not recorded in the transcript, so this is a hypothesis",
          }
    );
    current = model;
    modelCommandSincePrevious = false;
  }

  return findings;
}
