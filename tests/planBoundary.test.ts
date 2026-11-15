import { describe, it, expect } from "vitest";
import { checkPlanMode } from "../src/checks/planMode.js";

describe("checkPlanMode: where the plan-mode boundary falls", () => {
  it("places the turns after an approved plan on the execution side", async () => {
    // The plan is approved in the middle of a turn: the mode changes, the
    // next user turn is still far away. Those turns are execution.
    const f = await checkPlanMode("tests/fixtures/plan-approved-midturn.jsonl");
    expect(f.detail).toBe("plan: claude-opus-5-5 | execution: claude-sonnet-5-5");
    expect(f.status).toBe("ok");
  });

  it("places turns in plan mode entered mid-turn on the plan side", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-entered-midturn.jsonl");
    expect(f.detail).toBe("plan: claude-opus-5-5 | execution: claude-sonnet-5-5");
    expect(f.status).toBe("ok");
  });

  it("takes the mode only from user turns and permission-mode records", async () => {
    // Lookalike: some other record type that happens to carry the field.
    const f = await checkPlanMode("tests/fixtures/plan-lookalike.jsonl");
    expect(f.status).toBe("unverifiable");
    expect(f.detail).toContain("no turn in this session was recorded in plan mode");
  });
});
