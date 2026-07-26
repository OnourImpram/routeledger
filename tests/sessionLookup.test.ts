import { describe, it, expect } from "vitest";
import { allSessions, findSessionById, findLatestSession } from "../src/sessions.js";

const ROOT = "tests/fixtures/projects";

describe("allSessions", () => {
  it("butun slug'lardaki oturumlari toplar", () => {
    const ids = allSessions(ROOT)
      .map((s) => s.sessionId)
      .sort();
    expect(ids).toEqual(["aaa-111", "bbb-222", "ccc-333"]);
  });

  it("olmayan kok icin bos dizi dondurur", () => {
    expect(allSessions("tests/fixtures/yok-boyle-kok")).toEqual([]);
  });
});

describe("findSessionById", () => {
  it("tam kimlikle bulur", () => {
    const s = findSessionById("bbb-222", ROOT);
    expect(s?.sessionId).toBe("bbb-222");
    expect(s?.slug).toBe("SLUG-A");
  });

  it("onek ile bulur", () => {
    expect(findSessionById("ccc", ROOT)?.sessionId).toBe("ccc-333");
  });

  it("eslesme yoksa null dondurur", () => {
    expect(findSessionById("zzz", ROOT)).toBeNull();
  });

  it("subagent dizinini oturum kimliginin altinda arar", () => {
    const s = findSessionById("aaa-111", ROOT);
    expect(s?.subagentDir.replace(/\\/g, "/")).toContain("SLUG-A/aaa-111/subagents");
  });
});

describe("findLatestSession", () => {
  it("cwd slug'i eslesmezse fallback isaretiyle en son oturumu dondurur", () => {
    const found = findLatestSession("C:\\hicbir\\yerde\\yok", ROOT);
    expect(found).not.toBeNull();
    expect(found!.usedFallback).toBe(true);
  });

  it("cwd slug'i eslesirse fallback isareti dusmez", () => {
    const found = findLatestSession("SLUG-A", ROOT);
    expect(found).not.toBeNull();
    expect(found!.usedFallback).toBe(false);
    expect(found!.session.slug).toBe("SLUG-A");
  });
});
