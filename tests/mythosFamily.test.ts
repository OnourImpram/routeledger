import { describe, it, expect } from "vitest";
import { familyOfModelId, familyOfDeclared } from "../src/models.js";

describe("the mythos family", () => {
  it("is recognised from a served model id", () => {
    expect(familyOfModelId("claude-mythos-5-2")).toBe("mythos");
    expect(familyOfModelId("claude-mythos-5-2[1m]")).toBe("mythos");
  });

  it("is recognised as a declared family name and as a declared full id", () => {
    expect(familyOfDeclared("mythos")).toBe("mythos");
    expect(familyOfDeclared("Mythos")).toBe("mythos");
    expect(familyOfDeclared("claude-mythos-5-2")).toBe("mythos");
  });

  it("is a family of its own, not another spelling of fable", () => {
    expect(familyOfModelId("claude-mythos-5-2")).not.toBe(familyOfModelId("claude-fable-5-2"));
  });

  it("does not swallow ids that only look like it", () => {
    expect(familyOfModelId("mythos-5-2")).toBe("unknown");
    expect(familyOfModelId("claude-mythosx-1")).toBe("unknown");
    expect(familyOfDeclared("mythos-plan")).toBe("unknown");
  });
});

describe("the current generation", () => {
  it("maps the current model ids to their families", () => {
    expect(familyOfModelId("claude-fable-5-2")).toBe("fable");
    expect(familyOfModelId("claude-opus-5-5")).toBe("opus");
    expect(familyOfModelId("claude-sonnet-5-5")).toBe("sonnet");
    expect(familyOfModelId("claude-haiku-5-5")).toBe("haiku");
  });
});
