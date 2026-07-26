import { describe, it, expect } from "vitest";
import { checkSubagents } from "../src/checks/subagents.js";

describe("checkSubagents", () => {
  it("uyumlu, uyumsuz ve beyansiz ucunu de dogru siniflar", async () => {
    const findings = await checkSubagents("tests/fixtures/subagents");
    const byId = Object.fromEntries(findings.map((f) => [f.title.split(" ")[0], f]));

    expect(byId["agent-aaa"]!.status).toBe("ok");
    expect(byId["agent-bbb"]!.status).toBe("mismatch");
    expect(byId["agent-bbb"]!.detail).toContain("sonnet");
    expect(byId["agent-bbb"]!.detail).toContain("claude-opus-5[1m]");
    expect(byId["agent-ccc"]!.status).toBe("unverifiable");
  });

  it("dizin yoksa bos dizi dondurur, patlamaz", async () => {
    expect(await checkSubagents("tests/fixtures/yok-boyle-dizin")).toEqual([]);
  });
});
