import { describe, it, expect } from "vitest";
import { checkPlanMode } from "../src/checks/planMode.js";

describe("checkPlanMode", () => {
  it("emits an observation when plan and execution share a model", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-same.jsonl");
    expect(f.status).toBe("observation");
    expect(f.detail).toContain("claude-opus-5");
    expect(f.inference).toBeTruthy();
  });

  it("returns unverifiable when plan mode was never entered", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-none.jsonl");
    expect(f.status).toBe("unverifiable");
  });

  it("returns unverifiable when there was no turn outside plan mode either", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-only.jsonl");
    expect(f.status).toBe("unverifiable");
    expect(f.detail).toContain("no turn outside plan mode");
  });

  it("flags a model that served both sides, even when the two sets differ", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-overlap.jsonl");
    expect(f.status).toBe("observation");
    expect(f.detail).toBe("plan: claude-fable-5 | execution: claude-fable-5, claude-opus-4-8");
    expect(f.inference).toContain("claude-fable-5");
  });

  it("stays ok when the two sides share no model at all", async () => {
    const f = await checkPlanMode("tests/fixtures/change.jsonl");
    expect(["ok", "unverifiable"]).toContain(f.status);
  });
});
