import { describe, it, expect } from "vitest";
import { checkSubagents } from "../src/checks/subagents.js";

const DIR = "tests/fixtures/subagents-nested";

describe("checkSubagents: agents below the subagent directory", () => {
  it("checks an agent launched by a workflow run", async () => {
    const findings = await checkSubagents(DIR);
    const inner = findings.find((f) => f.title.includes("agent-inner"));
    expect(inner).toBeDefined();
    expect(inner!.status).toBe("mismatch");
    expect(inner!.detail).toBe("declared: sonnet -> served: claude-opus-5-5");
  });

  it("names a nested agent by where it lives, with forward slashes on every platform", async () => {
    const findings = await checkSubagents(DIR);
    expect(findings.map((f) => f.title)).toContain("workflows/wf_run1/agent-inner (general-purpose)");
  });

  it("reports a nested declaration with no transcript instead of skipping it", async () => {
    const findings = await checkSubagents(DIR);
    const quiet = findings.find((f) => f.title.includes("agent-quiet"));
    expect(quiet).toBeDefined();
    expect(quiet!.status).toBe("unverifiable");
    expect(quiet!.detail).toContain("transcript");
  });

  it("still names a top-level agent by its id alone", async () => {
    const findings = await checkSubagents(DIR);
    expect(findings.map((f) => f.title)).toContain("agent-top (general-purpose)");
  });

  it("accepts a declared mythos id served by the same family", async () => {
    const findings = await checkSubagents(DIR);
    const top = findings.find((f) => f.title.startsWith("agent-top"));
    expect(top!.status).toBe("ok");
  });

  it("finds every declaration exactly once", async () => {
    const findings = await checkSubagents(DIR);
    expect(findings).toHaveLength(3);
  });
});
