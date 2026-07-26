import { describe, it, expect } from "vitest";
import { checkPlanMode } from "../src/checks/planMode.js";

describe("checkPlanMode", () => {
  it("plan ve uygulama ayni modeldeyse gozlem uretir", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-same.jsonl");
    expect(f.status).toBe("observation");
    expect(f.detail).toContain("claude-opus-5");
    expect(f.inference).toBeTruthy();
  });

  it("plan moduna hic girilmemisse unverifiable dondurur", async () => {
    const f = await checkPlanMode("tests/fixtures/plan-none.jsonl");
    expect(f.status).toBe("unverifiable");
  });
});
