import { describe, it, expect } from "vitest";
import { familyOfModelId, familyOfDeclared, compareVersions, isBeyondFence, isParseableVersion, LAST_TESTED_CC_VERSION } from "../src/models.js";

describe("familyOfModelId", () => {
  it("recognises the known families", () => {
    expect(familyOfModelId("claude-fable-5")).toBe("fable");
    expect(familyOfModelId("claude-opus-4-8")).toBe("opus");
    expect(familyOfModelId("claude-sonnet-5")).toBe("sonnet");
    expect(familyOfModelId("claude-haiku-4-5-20251001")).toBe("haiku");
  });
  it("strips the [1m] suffix", () => {
    expect(familyOfModelId("claude-fable-5[1m]")).toBe("fable");
  });
  it("maps anything unrecognised to unknown", () => {
    expect(familyOfModelId("<synthetic>")).toBe("unknown");
    expect(familyOfModelId("gpt-5.6")).toBe("unknown");
  });
});

describe("familyOfDeclared", () => {
  it("resolves aliases", () => {
    expect(familyOfDeclared("fable")).toBe("fable");
    expect(familyOfDeclared("Opus")).toBe("opus");
  });
  it("resolves a full model id too", () => {
    expect(familyOfDeclared("claude-sonnet-5")).toBe("sonnet");
  });
  it("leaves inherit as unknown", () => {
    expect(familyOfDeclared("inherit")).toBe("unknown");
  });
});

describe("version fence", () => {
  it("compares versions numerically", () => {
    expect(compareVersions("2.1.220", "2.1.207")).toBeGreaterThan(0);
    expect(compareVersions("2.1.207", "2.1.220")).toBeLessThan(0);
    expect(compareVersions("2.1.220", "2.1.220")).toBe(0);
    expect(compareVersions("2.2.0", "2.1.999")).toBeGreaterThan(0);
  });
  it("accepts the version shapes Claude Code actually writes", () => {
    for (const v of ["2.1.220", "2.2.0", "3", "2.1.220-beta.1", " 2.1.220 "]) {
      expect(isParseableVersion(v)).toBe(true);
    }
  });

  it("refuses a version it cannot compare, rather than reading it as 0.0.0", () => {
    // compareVersions parses per segment with `|| 0`, so every one of these
    // would otherwise compare below the fence and pass at full confidence.
    for (const v of ["banana", "", "v2.2.0", "2.1.abc", "next", "2..", "2.1.220+meta"]) {
      expect(isParseableVersion(v)).toBe(false);
    }
  });

  it("flags anything past the tested version", () => {
    expect(isBeyondFence(LAST_TESTED_CC_VERSION)).toBe(false);
    expect(isBeyondFence("2.1.221")).toBe(true);
    expect(isBeyondFence("2.1.100")).toBe(false);
  });
});
