import { readJsonl } from "../jsonl.js";
import type { Finding } from "../types.js";

/**
 * Compares the models that served plan-mode turns with the ones that served
 * the rest of the session.
 *
 * The mode is read from permissionMode on the USER turn; standalone
 * type:"permission-mode" records carry no timestamp and no uuid
 * (measured 2026-07-26), so they are not trusted.
 */
export async function checkPlanMode(mainPath: string): Promise<Finding> {
  const planModels = new Set<string>();
  const otherModels = new Set<string>();
  let mode: string | null = null;

  for await (const rec of readJsonl(mainPath)) {
    if (rec["type"] === "user") {
      const pm = rec["permissionMode"];
      if (typeof pm === "string") mode = pm;
      continue;
    }
    if (rec["type"] !== "assistant") continue;

    const msg = rec["message"];
    if (typeof msg !== "object" || msg === null) continue;
    const model = (msg as Record<string, unknown>)["model"];
    if (typeof model !== "string" || model === "<synthetic>") continue;

    if (mode === "plan") planModels.add(model);
    else otherModels.add(model);
  }

  if (planModels.size === 0) {
    return {
      check: "plan-mode",
      status: "unverifiable",
      title: "plan-mode profile",
      detail: "no turn in this session was recorded in plan mode",
    };
  }

  const plan = [...planModels].sort();
  const other = [...otherModels].sort();

  // No non-plan turn means there was nothing to compare against. Saying "ok"
  // here would claim a comparison that never happened.
  if (other.length === 0) {
    return {
      check: "plan-mode",
      status: "unverifiable",
      title: "plan-mode profile",
      detail: `plan: ${plan.join(", ")} | execution: - (no turn outside plan mode to compare against)`,
    };
  }

  // Any shared model is the signal, not just an identical set. If plan mode
  // ran on {fable} and execution on {fable, opus}, fable served both sides —
  // the boundary did not separate them, which is exactly what this check is
  // for. Strict set-equality missed that and reported it as ok.
  const shared = plan.filter((m) => other.includes(m));

  return {
    check: "plan-mode",
    status: shared.length > 0 ? "observation" : "ok",
    title: "plan-mode profile",
    detail: `plan: ${plan.join(", ")} | execution: ${other.join(", ")}`,
    inference:
      shared.length > 0
        ? `${shared.join(", ")} served turns on both sides of the plan-mode boundary; if you expected a plan-mode upgrade, it may never have fired. The configuration at session time is not recorded in the transcript, so this is an observation, not a verdict`
        : undefined,
  };
}
