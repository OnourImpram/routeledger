export type Family = "fable" | "opus" | "sonnet" | "haiku" | "unknown";

/** routeledger'in uzerinde fiilen dogrulandigi en yeni Claude Code surumu. */
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

/** Test edilmemis, daha yeni bir surumde iddia uretmemek icin. */
export function isBeyondFence(version: string): boolean {
  return compareVersions(version, LAST_TESTED_CC_VERSION) > 0;
}
