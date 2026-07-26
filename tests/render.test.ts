import { describe, it, expect } from "vitest";
import { degradeBeyondFence, render, renderJson } from "../src/render.js";
import type { Finding } from "../src/types.js";

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

  it("surum citinin otesinde uyari basar ve model tablosunu ham sayim diye etiketler", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: ["2.9.0"], beyondFence: true,
      modelTotals: { "claude-opus-5": 2 }, findings: [],
    });
    expect(out).toContain("2.9.0");
    expect(out.toLowerCase()).toContain("unverifiable");
    expect(out).toContain("ham sayim");
  });

  it("surum bilgisi hic yoksa da uyari basar ve tabloyu etiketler", () => {
    const out = render({
      slug: "s", sessionId: "x", usedFallback: false,
      versions: [], beyondFence: false, versionsUnknown: true,
      modelTotals: { "claude-opus-5": 2 }, findings: [],
    });
    expect(out.toLowerCase()).toContain("unverifiable");
    expect(out).toContain("ham sayim");
  });
});

describe("degradeBeyondFence", () => {
  const base: Omit<Finding, "status"> = {
    check: "subagent-model",
    title: "agent-x (executor)",
    detail: "beyan: sonnet -> fiilen: claude-opus-5",
  };

  it("mismatch, ok ve observation'i unverifiable'a dusurur, uretilmeyen iddiayi detayda saklar", () => {
    for (const status of ["mismatch", "ok", "observation"] as const) {
      const [out] = degradeBeyondFence([{ ...base, status }]);
      expect(out!.status).toBe("unverifiable");
      expect(out!.detail).toContain(status);
      expect(out!.detail).toContain("beyan: sonnet");
    }
  });

  it("zaten unverifiable olani oldugu gibi birakir", () => {
    const f: Finding = { ...base, status: "unverifiable" };
    expect(degradeBeyondFence([f])).toEqual([f]);
  });
});

describe("renderJson", () => {
  it("gecerli JSON basar ve tum bulgulari icerir", () => {
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
