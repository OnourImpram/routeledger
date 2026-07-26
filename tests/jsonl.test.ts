import { describe, it, expect } from "vitest";
import { readJsonl } from "../src/jsonl.js";

describe("readJsonl", () => {
  it("bozuk satiri atlar, gecerli satirlari sirayla dondurur", async () => {
    const out: unknown[] = [];
    for await (const rec of readJsonl("tests/fixtures/basic.jsonl")) out.push(rec);
    expect(out).toHaveLength(3);
    expect((out[1] as any).message.model).toBe("claude-opus-5");
    expect((out[2] as any).message.model).toBe("claude-fable-5");
  });
});
