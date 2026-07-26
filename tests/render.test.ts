import { describe, it, expect } from "vitest";
import { degradeBeyondFence, render, renderJson } from "../src/render.js";
import type { Finding } from "../src/types.js";

describe("render", () => {
  it("prints findings with their status and puts the inference on its own line", () => {
    const out = render({
      slug: "C--Users-onuri-Hezarfen-Vault",
      sessionId: "abc123",
      usedFallback: false,
      versions: ["2.1.220"],
      beyondFence: false,
      modelTotals: { "claude-opus-5": 10, "claude-fable-5": 3 },
      findings: [
        { check: "subagent-model", status: "mismatch", title: "agent-bbb (executor)", detail: "declared: sonnet -> served: claude-opus-5" },
        { check: "plan-mode", status: "observation", title: "plan-mode profile", detail: "plan: claude-opus-5 | execution: claude-opus-5", inference: "plan and execution ran on the same model" },
      ],
    });
    expect(out).toContain("MISMATCH");
    expect(out).toContain("agent-bbb");
    expect(out).toContain("OBSERVATION");
    expect(out).toContain("claude-opus-5");
    expect(out).toContain("inference: plan and execution ran on the same model");
  });

  it("warns beyond the version fence and labels the model table a raw count", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: ["2.9.0"], beyondFence: true,
      modelTotals: { "claude-opus-5": 2 }, findings: [],
    });
    expect(out).toContain("2.9.0");
    expect(out.toLowerCase()).toContain("unverifiable");
    expect(out).toContain("raw count");
  });

  it("warns and labels the table when no version is recorded either", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: [], beyondFence: false, versionsUnknown: true,
      modelTotals: { "claude-opus-5": 2 }, findings: [],
    });
    expect(out.toLowerCase()).toContain("unverifiable");
    expect(out).toContain("raw count");
  });

  it("counts turns in the singular when there is exactly one", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: ["2.1.220"], beyondFence: false,
      modelTotals: { "claude-opus-5": 1, "claude-fable-5": 2 }, findings: [],
    });
    expect(out).toContain("1 turn\n");
    expect(out).toContain("2 turns");
  });

  it("says so when the audited session was not the one for this directory", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: true,
      versions: ["2.1.220"], beyondFence: false,
      modelTotals: {}, findings: [],
    });
    expect(out).toContain("audited the most recent one");
  });
});

describe("degradeBeyondFence", () => {
  const base: Omit<Finding, "status"> = {
    check: "subagent-model",
    title: "agent-x (executor)",
    detail: "declared: sonnet -> served: claude-opus-5",
  };

  it("drops mismatch, ok and observation to unverifiable, keeping the withdrawn claim in the detail", () => {
    for (const status of ["mismatch", "ok", "observation"] as const) {
      const [out] = degradeBeyondFence([{ ...base, status }]);
      expect(out!.status).toBe("unverifiable");
      expect(out!.detail).toContain(status);
      expect(out!.detail).toContain("declared: sonnet");
    }
  });

  it("leaves an already unverifiable finding untouched", () => {
    const f: Finding = { ...base, status: "unverifiable" };
    expect(degradeBeyondFence([f])).toEqual([f]);
  });
});

describe("renderJson", () => {
  it("prints valid JSON and carries every finding", () => {
    const out = renderJson({
      slug: "S", sessionId: "abc", usedFallback: true,
      versions: ["2.1.220"], beyondFence: false,
      modelTotals: { "claude-opus-5": 4 },
      findings: [
        { check: "plan-mode", status: "ok", title: "t1", detail: "d1" },
        { check: "model-change", status: "observation", title: "t2", detail: "d2", inference: "i2" },
      ],
    });
    const parsed = JSON.parse(out) as {
      sessionId: string; usedFallback: boolean;
      versionFence: { lastTested: string; beyondFence: boolean };
      modelsServed: Record<string, number>;
      findings: Array<{ status: string; inference?: string }>;
    };
    expect(parsed.sessionId).toBe("abc");
    expect(parsed.usedFallback).toBe(true);
    expect(parsed.versionFence.beyondFence).toBe(false);
    expect(parsed.modelsServed["claude-opus-5"]).toBe(4);
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.findings[1]!.inference).toBe("i2");
  });
});
