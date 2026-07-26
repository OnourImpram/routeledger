import { describe, it, expect } from "vitest";
import { render } from "../src/render.js";

describe("render", () => {
  it("bulgulari durumlariyla basar ve cikarimi ayri satirda gosterir", () => {
    const out = render({
      slug: "C--Users-onuri-Hezarfen-Vault",
      sessionId: "abc123",
      usedFallback: false,
      versions: ["2.1.220"],
      beyondFence: false,
      modelTotals: { "claude-opus-5": 10, "claude-fable-5": 3 },
      findings: [
        { check: "subagent-model", status: "mismatch", title: "agent-bbb (executor)", detail: "beyan: sonnet -> fiilen: claude-opus-5" },
        { check: "plan-mode", status: "unverifiable", title: "plan modu profili", detail: "kayit yok" },
      ],
    });
    expect(out).toContain("MISMATCH");
    expect(out).toContain("agent-bbb");
    expect(out).toContain("UNVERIFIABLE");
    expect(out).toContain("claude-opus-5");
  });

  it("surum citinin otesinde uyari basar", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: ["2.9.0"], beyondFence: true,
      modelTotals: {}, findings: [],
    });
    expect(out).toContain("2.9.0");
    expect(out.toLowerCase()).toContain("unverifiable");
  });
});
