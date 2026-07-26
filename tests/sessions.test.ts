import { describe, it, expect } from "vitest";
import { slugForCwd } from "../src/sessions.js";

describe("slugForCwd", () => {
  it("Windows yolunu Claude Code slug'ina cevirir", () => {
    expect(slugForCwd("C:\\Users\\onuri\\Hezarfen-Vault")).toBe("C--Users-onuri-Hezarfen-Vault");
  });
  it("POSIX yolunu cevirir", () => {
    expect(slugForCwd("/home/onuri/proj")).toBe("-home-onuri-proj");
  });
});
