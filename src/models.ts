export type Family = "fable" | "opus" | "sonnet" | "haiku" | "unknown";

/** The newest Claude Code version routeledger has actually been verified on. */
export const LAST_TESTED_CC_VERSION = "2.1.220";

const PREFIXES: ReadonlyArray<readonly [string, Family]> = [
  ["claude-fable-", "fable"],
  ["claude-opus-", "opus"],
  ["claude-sonnet-", "sonnet"],
  ["claude-haiku-", "haiku"],
];

function stripContextTag(s: string): string {
  return s.replace(/\[1m\]$/, "");
}

export function familyOfModelId(id: string): Family {
  const s = stripContextTag(id.trim());
  for (const [prefix, family] of PREFIXES) {
    if (s.startsWith(prefix)) return family;
  }
  return "unknown";
}

export function familyOfDeclared(declared: string): Family {
  const s = stripContextTag(declared.trim().toLowerCase());
  if (s === "fable" || s === "opus" || s === "sonnet" || s === "haiku") return s;
  return familyOfModelId(s);
}

/**
 * A version string this tool knows how to compare. Anything else is not
 * "old" — it is unreadable, which is strictly less evidence than a version
 * that is merely missing. compareVersions() parses per segment with
 * `|| 0`, so "banana" would otherwise compare as 0.0.0 and walk straight
 * under the fence at full confidence.
 */
const VERSION_RE = /^\d+(\.\d+)*(-[0-9A-Za-z.-]+)?$/;

export function isParseableVersion(version: string): boolean {
  return VERSION_RE.test(version.trim());
}

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

/** So that no claim is made on an untested, newer version. */
export function isBeyondFence(version: string): boolean {
  return compareVersions(version, LAST_TESTED_CC_VERSION) > 0;
}
