import { describe, it, expect } from "vitest";
import { slugForCwd } from "../src/sessions.js";

describe("slugForCwd", () => {
  it("converts a Windows path into a Claude Code slug", () => {
    expect(slugForCwd("C:\\Users\\onuri\\Hezarfen-Vault")).toBe("C--Users-onuri-Hezarfen-Vault");
  });
  it("converts a POSIX path", () => {
    expect(slugForCwd("/home/onuri/proj")).toBe("-home-onuri-proj");
  });

  // Measured against directories that exist under ~/.claude/projects:
  // replacing only \ / and : sent these to the wrong project entirely.
  it("replaces every non-alphanumeric character, not just separators", () => {
    expect(slugForCwd("C:\\Users\\onuri\\.claude")).toBe("C--Users-onuri--claude");
    expect(slugForCwd("C:\\Users\\onuri\\my project")).toBe("C--Users-onuri-my-project");
    expect(slugForCwd("C:\\app\\v1.2")).toBe("C--app-v1-2");
    expect(slugForCwd("C:\\Users\\onuri\\düzeltilmiş sürüm")).toBe("C--Users-onuri-d-zeltilmi--s-r-m");
  });
});
