import { describe, it, expect } from "vitest";
import { allSessions, findSessionById, findLatestSession } from "../src/sessions.js";

const ROOT = "tests/fixtures/projects";

describe("allSessions", () => {
  it("collects sessions across every slug", () => {
    const ids = allSessions(ROOT)
      .map((s) => s.sessionId)
      .sort();
    expect(ids).toEqual(["aaa-111", "bbb-222", "ccc-333"]);
  });

  it("returns an empty array for a root that does not exist", () => {
    expect(allSessions("tests/fixtures/no-such-root")).toEqual([]);
  });
});

describe("findSessionById", () => {
  it("finds by exact id", () => {
    const s = findSessionById("bbb-222", ROOT);
    expect(s?.sessionId).toBe("bbb-222");
    expect(s?.slug).toBe("SLUG-A");
  });

  it("finds by prefix", () => {
    expect(findSessionById("ccc", ROOT)?.sessionId).toBe("ccc-333");
  });

  it("returns null when nothing matches", () => {
    expect(findSessionById("zzz", ROOT)).toBeNull();
  });

  it("looks for the subagent directory under the session id", () => {
    const s = findSessionById("aaa-111", ROOT);
    expect(s?.subagentDir.replace(/\\/g, "/")).toContain("SLUG-A/aaa-111/subagents");
  });
});

describe("findLatestSession", () => {
  it("returns the most recent session, flagged as a fallback, when the cwd slug misses", () => {
    const found = findLatestSession("C:\\nowhere\\at\\all", ROOT);
    expect(found).not.toBeNull();
    expect(found!.usedFallback).toBe(true);
  });

  it("does not raise the fallback flag when the cwd slug hits", () => {
    const found = findLatestSession("SLUG-A", ROOT);
    expect(found).not.toBeNull();
    expect(found!.usedFallback).toBe(false);
    expect(found!.session.slug).toBe("SLUG-A");
  });
});
