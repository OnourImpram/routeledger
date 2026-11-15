import { readJsonl } from "../jsonl.js";
import type { Finding } from "../types.js";

/**
 * Compares the models that served plan-mode turns with the ones that served
 * the rest of the session.
 *
 * The mode is read from two kinds of record, whichever was written last:
 * permissionMode on a USER turn, and the standalone type:"permission-mode"
 * records. The standalone records carry no timestamp and no uuid (measured
 * 2026-07-26), so file order is the only thing that places them. They are
 * written when the mode changes, though, and a user turn is not: approving
 * a plan leaves plan mode in the middle of a turn, and the next user turn
 * can be hundreds of assistant records away.
 *
 * Measured 2026-11-15 on the 29 sessions with a plan-mode turn found on one
 * machine (Claude Code 2.1.81 to 2.1.325), 14 of which carry standalone
 * records. Counting assistant records between the last ExitPlanMode call
 * and the point where a signal leaves plan mode: the standalone record did
 * so within two records 22 times out of 29; the user turn once out of 25,
 * and more than ten records late 21 times. Read from user turns alone, the
 * turns that execute an approved plan were counted as plan-mode turns.
 *
 * A session that wrote no standalone record is still read from user turns
 * alone, with that limit.
 */
export async function checkPlanMode(mainPath: string): Promise<Finding> {
  const planModels = new Set<string>();
  const otherModels = new Set<string>();
  let mode: string | null = null;

  for await (const rec of readJsonl(mainPath)) {
    if (rec["type"] === "user" || rec["type"] === "permission-mode") {
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
