import { describe, it, expect } from "vitest";
import { checkSubagents } from "../src/checks/subagents.js";

describe("checkSubagents", () => {
  it("classifies agreeing, mismatching and undeclared correctly", async () => {
    const findings = await checkSubagents("tests/fixtures/subagents");
    const byId = Object.fromEntries(findings.map((f) => [f.title.split(" ")[0], f]));

    expect(byId["agent-aaa"]!.status).toBe("ok");
    expect(byId["agent-bbb"]!.status).toBe("mismatch");
    expect(byId["agent-bbb"]!.detail).toContain("sonnet");
    expect(byId["agent-bbb"]!.detail).toContain("claude-opus-5[1m]");
    expect(byId["agent-ccc"]!.status).toBe("unverifiable");
  });

  it("does not skip a corrupt meta.json in silence; emits an unverifiable finding", async () => {
    const findings = await checkSubagents("tests/fixtures/subagents");
    const ddd = findings.find((f) => f.title.startsWith("agent-ddd"));
    expect(ddd).toBeDefined();
    expect(ddd!.status).toBe("unverifiable");
    expect(ddd!.detail).toContain("meta.json");
  });

  it("emits an unverifiable finding when meta.json exists but the transcript does not", async () => {
    const findings = await checkSubagents("tests/fixtures/subagents");
    const eee = findings.find((f) => f.title.startsWith("agent-eee"));
    expect(eee).toBeDefined();
    expect(eee!.status).toBe("unverifiable");
    expect(eee!.detail).toContain("transcript");
  });

  it("returns an empty array for a missing directory instead of throwing", async () => {
    expect(await checkSubagents("tests/fixtures/no-such-dir")).toEqual([]);
  });
});
