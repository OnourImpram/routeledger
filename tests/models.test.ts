import { describe, it, expect } from "vitest";
import { familyOfModelId, familyOfDeclared, compareVersions, isBeyondFence, LAST_TESTED_CC_VERSION } from "../src/models.js";

describe("familyOfModelId", () => {
  it("bilinen aileleri tanir", () => {
    expect(familyOfModelId("claude-fable-5")).toBe("fable");
    expect(familyOfModelId("claude-opus-4-8")).toBe("opus");
    expect(familyOfModelId("claude-sonnet-5")).toBe("sonnet");
    expect(familyOfModelId("claude-haiku-4-5-20251001")).toBe("haiku");
  });
  it("[1m] ekini soyar", () => {
    expect(familyOfModelId("claude-fable-5[1m]")).toBe("fable");
  });
  it("bilinmeyeni unknown yapar", () => {
    expect(familyOfModelId("<synthetic>")).toBe("unknown");
    expect(familyOfModelId("gpt-5.6")).toBe("unknown");
  });
});

describe("familyOfDeclared", () => {
  it("alias'lari cozer", () => {
    expect(familyOfDeclared("fable")).toBe("fable");
    expect(familyOfDeclared("Opus")).toBe("opus");
  });
  it("tam model kimligini de cozer", () => {
    expect(familyOfDeclared("claude-sonnet-5")).toBe("sonnet");
  });
  it("inherit'i unknown birakir", () => {
    expect(familyOfDeclared("inherit")).toBe("unknown");
  });
});

describe("surum citi", () => {
  it("surumleri sayisal karsilastirir", () => {
    expect(compareVersions("2.1.220", "2.1.207")).toBeGreaterThan(0);
    expect(compareVersions("2.1.207", "2.1.220")).toBeLessThan(0);
    expect(compareVersions("2.1.220", "2.1.220")).toBe(0);
    expect(compareVersions("2.2.0", "2.1.999")).toBeGreaterThan(0);
  });
  it("test edilmis surumun otesini isaretler", () => {
    expect(isBeyondFence(LAST_TESTED_CC_VERSION)).toBe(false);
    expect(isBeyondFence("2.1.221")).toBe(true);
    expect(isBeyondFence("2.1.100")).toBe(false);
  });
});
