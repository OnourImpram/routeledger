import { describe, it, expect } from "vitest";
import { auditSession } from "../src/audit.js";
import { render, renderJson } from "../src/render.js";
import type { SessionRef } from "../src/types.js";

function ref(fixture: string): SessionRef {
  return {
    slug: "TEST",
    sessionId: "fence-test",
    mainPath: `tests/fixtures/audit/${fixture}`,
    subagentDir: "tests/fixtures/audit/no-such-dir",
    mtimeMs: 0,
  };
}

describe("auditSession — the version fence, end to end", () => {
  it("on a verified version an observation stays an observation (positive control)", async () => {
    const r = await auditSession(ref("fence-ok.jsonl"));
    expect(r.beyondFence).toBe(false);
    expect(r.versionsUnknown).toBe(false);
    const change = r.findings.find((f) => f.check === "model-change");
    expect(change!.status).toBe("observation");
  });

  it("beyond the fence the SAME finding falls to unverifiable", async () => {
    const r = await auditSession(ref("fence-high.jsonl"));
    expect(r.beyondFence).toBe(true);
    for (const f of r.findings) expect(f.status).toBe("unverifiable");
    const change = r.findings.find((f) => f.check === "model-change");
    expect(change!.detail).toContain("observation");
  });

  it("with no version field the fence still closes: not safe, unverifiable", async () => {
    const r = await auditSession(ref("fence-noversion.jsonl"));
    expect(r.versionsUnknown).toBe(true);
    expect(r.beyondFence).toBe(false);
    for (const f of r.findings) expect(f.status).toBe("unverifiable");
  });

  it("an unreadable version closes the fence too — it is less evidence, not more", async () => {
    const r = await auditSession(ref("fence-badversion.jsonl"));
    expect(r.beyondFence).toBe(false);
    expect(r.versionsUnknown).toBe(false);
    expect(r.unreadableVersions).toEqual(["banana"]);
    for (const f of r.findings) expect(f.status).toBe("unverifiable");
  });

  it("the model table is not called verified when the version is unreadable", async () => {
    const r = await auditSession(ref("fence-badversion.jsonl"));
    const json = JSON.parse(renderJson(r)) as {
      modelsServedVerified: boolean;
      versionFence: { closed: boolean; unreadableVersions: string[] };
    };
    expect(json.modelsServedVerified).toBe(false);
    expect(json.versionFence.closed).toBe(true);
    expect(json.versionFence.unreadableVersions).toEqual(["banana"]);
    expect(render(r)).toContain("Unreadable Claude Code version: banana");
  });

  it("the model count reaches the report", async () => {
    const r = await auditSession(ref("fence-ok.jsonl"));
    expect(r.modelTotals["claude-opus-5"]).toBe(1);
    expect(r.modelTotals["claude-fable-5"]).toBe(1);
  });
});
