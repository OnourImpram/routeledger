import { describe, it, expect, vi } from "vitest";

// One project directory that cannot be listed: a permission error on scandir.
// node:fs is wrapped to reproduce it, because a directory the test runner may
// not read cannot be created portably.
vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  const locked = (p: unknown): boolean => String(p).replace(/\\/g, "/").endsWith("/SLUG-LOCKED");
  const readdirSync = (p: unknown, ...rest: unknown[]): unknown => {
    if (locked(p)) {
      throw Object.assign(new Error("EPERM: operation not permitted, scandir"), { code: "EPERM" });
    }
    return (real.readdirSync as (...a: unknown[]) => unknown)(p, ...rest);
  };
  return { ...real, readdirSync };
});

import * as sessions from "../src/sessions.js";

const ROOT = "tests/fixtures/projects-locked";

describe("a project directory that cannot be listed", () => {
  it("does not take the other projects down with it", () => {
    expect(sessions.allSessions(ROOT).map((s) => s.sessionId)).toEqual(["open-111"]);
  });

  it("still finds a session by id in a readable project", () => {
    expect(sessions.findSessionById("open", ROOT)?.sessionId).toBe("open-111");
  });

  it("is reported, not passed over", () => {
    expect(sessions.unreadableProjects(ROOT)).toEqual(["SLUG-LOCKED"]);
  });

  it("falls back to the other projects when it is the directory of the cwd", () => {
    const found = sessions.findLatestSession("SLUG/LOCKED", ROOT);
    expect(found?.session.sessionId).toBe("open-111");
    expect(found?.usedFallback).toBe(true);
  });

  it("reports nothing when every project can be read (negative control)", () => {
    expect(sessions.unreadableProjects("tests/fixtures/projects")).toEqual([]);
    expect(sessions.allSessions("tests/fixtures/projects")).toHaveLength(3);
  });
});
