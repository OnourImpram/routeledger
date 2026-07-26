import { describe, it, expect } from "vitest";
import { checkModelChange } from "../src/checks/modelChange.js";

describe("checkModelChange", () => {
  it("aciklanmamis degisimi isaretler, /model sonrasini isaretlemez", async () => {
    const findings = await checkModelChange("tests/fixtures/change.jsonl");
    const flagged = findings.filter((f) => f.status !== "ok");
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.detail).toContain("claude-fable-5");
    expect(flagged[0]!.detail).toContain("claude-opus-4-8");
    expect(flagged[0]!.inference).toBeTruthy();
  });
});
