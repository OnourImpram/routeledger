import { describe, it, expect } from "vitest";
import { auditSession } from "../src/audit.js";
import type { SessionRef } from "../src/types.js";

function ref(fixture: string): SessionRef {
  return {
    slug: "TEST",
    sessionId: "fence-test",
    mainPath: `tests/fixtures/audit/${fixture}`,
    subagentDir: "tests/fixtures/audit/yok-boyle-dizin",
    mtimeMs: 0,
  };
}

describe("auditSession — surum citi uctan uca", () => {
  it("dogrulanmis surumde observation oldugu gibi kalir (pozitif kontrol)", async () => {
    const r = await auditSession(ref("fence-ok.jsonl"));
    expect(r.beyondFence).toBe(false);
    expect(r.versionsUnknown).toBe(false);
    const change = r.findings.find((f) => f.check === "model-change");
    expect(change!.status).toBe("observation");
  });

  it("citin otesindeki surumde AYNI bulgu unverifiable'a duser", async () => {
    const r = await auditSession(ref("fence-high.jsonl"));
    expect(r.beyondFence).toBe(true);
    for (const f of r.findings) expect(f.status).toBe("unverifiable");
    const change = r.findings.find((f) => f.check === "model-change");
    expect(change!.detail).toContain("observation");
  });

  it("surum alani hic yoksa cit yine kapanir: guvenli degil, unverifiable", async () => {
    const r = await auditSession(ref("fence-noversion.jsonl"));
    expect(r.versionsUnknown).toBe(true);
    expect(r.beyondFence).toBe(false);
    for (const f of r.findings) expect(f.status).toBe("unverifiable");
  });

  it("model sayimi rapora girer", async () => {
    const r = await auditSession(ref("fence-ok.jsonl"));
    expect(r.modelTotals["claude-opus-5"]).toBe(1);
    expect(r.modelTotals["claude-fable-5"]).toBe(1);
  });
});
