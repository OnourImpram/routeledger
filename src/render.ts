import { LAST_TESTED_CC_VERSION } from "./models.js";
import type { Finding } from "./types.js";

export interface Report {
  slug: string;
  sessionId: string;
  usedFallback: boolean;
  versions: string[];
  beyondFence: boolean;
  /** true when no record carries a version field — the fence still closes. */
  versionsUnknown?: boolean;
  /** version strings that could not be parsed — the fence closes on these too. */
  unreadableVersions?: string[];
  modelTotals: Record<string, number>;
  findings: Finding[];
  /** true prints matching findings individually as well. */
  showAll?: boolean;
}

/** Fence closed: version beyond the tested one, missing, or unreadable. */
function fenced(r: Report): boolean {
  return r.beyondFence || r.versionsUnknown === true || (r.unreadableVersions?.length ?? 0) > 0;
}

/** What needs attention first. Order within a status is preserved. */
const PRIORITY: Record<Finding["status"], number> = {
  mismatch: 0,
  observation: 1,
  unverifiable: 2,
  ok: 3,
};

const LABEL: Record<Finding["status"], string> = {
  ok: "OK          ",
  mismatch: "MISMATCH    ",
  unverifiable: "UNVERIFIABLE",
  observation: "OBSERVATION ",
};

/**
 * Version fence: on an unverified Claude Code version no claim is made.
 * mismatch/ok/observation fall to unverifiable; the claim that was NOT
 * made is kept in the detail line so you can see what was withdrawn.
 * Findings that were already unverifiable are left untouched.
 */
export function degradeBeyondFence(findings: Finding[]): Finding[] {
  return findings.map((f) =>
    f.status === "unverifiable"
      ? f
      : {
          ...f,
          status: "unverifiable" as const,
          detail: `${f.detail} (version fence: unverified version, no "${f.status}" claim made)`,
        }
  );
}

/** Machine-readable report. Unlike the text output it always has every finding. */
export function renderJson(r: Report): string {
  return (
    JSON.stringify(
      {
        sessionId: r.sessionId,
        project: r.slug,
        usedFallback: r.usedFallback,
        claudeCodeVersions: r.versions,
        versionFence: {
          lastTested: LAST_TESTED_CC_VERSION,
          beyondFence: r.beyondFence,
          versionsUnknown: r.versionsUnknown ?? false,
          unreadableVersions: r.unreadableVersions ?? [],
          closed: fenced(r),
        },
        /** when fenced, modelsServed is a raw count, not a verified fact. */
        modelsServedVerified: !fenced(r),
        modelsServed: r.modelTotals,
        findings: r.findings,
      },
      null,
      2
    ) + "\n"
  );
}

export function render(r: Report): string {
  const lines: string[] = [];
  lines.push(`routeledger — session ${r.sessionId}`);
  lines.push(`  project: ${r.slug}${r.usedFallback ? "  (no session here; audited the most recent one)" : ""}`);
  lines.push(`  claude code: ${r.versions.join(", ") || "unknown"}`);
  lines.push("");

  // Independent conditions, not a chain: a session can carry both a version
  // beyond the fence and another one this tool cannot read, and hiding the
  // second behind the first would under-report why the fence closed.
  if (r.beyondFence) {
    lines.push(
      `  ! This session is newer than the version routeledger was verified on (${LAST_TESTED_CC_VERSION}).`
    );
    lines.push("    Findings are treated as unverifiable; the format may have changed.");
    lines.push("");
  }
  if (r.versionsUnknown === true) {
    lines.push("  ! No record carries a Claude Code version field.");
    lines.push("    The format cannot be verified; findings are treated as unverifiable.");
    lines.push("");
  }
  if (r.unreadableVersions !== undefined && r.unreadableVersions.length > 0) {
    lines.push(`  ! Unreadable Claude Code version: ${r.unreadableVersions.join(", ")}`);
    lines.push("    The format cannot be verified; findings are treated as unverifiable.");
    lines.push("");
  }

  lines.push(fenced(r) ? "  MODELS SERVED (raw count — format unverified)" : "  MODELS SERVED");
  const entries = Object.entries(r.modelTotals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) lines.push("    (no records)");
  for (const [model, count] of entries) {
    lines.push(`    ${model.padEnd(28)} ${String(count).padStart(6)} ${count === 1 ? "turn" : "turns"}`);
  }
  lines.push("");

  lines.push("  FINDINGS");
  if (r.findings.length === 0) lines.push("    (none)");

  const sorted = r.findings
    .map((f, i) => ({ f, i }))
    .sort((a, b) => PRIORITY[a.f.status] - PRIORITY[b.f.status] || a.i - b.i)
    .map((x) => x.f);

  const okCount = sorted.filter((f) => f.status === "ok").length;
  const collapseOk = !r.showAll && okCount > 3;

  for (const f of sorted) {
    if (collapseOk && f.status === "ok") continue;
    lines.push(`    [${LABEL[f.status]}] ${f.title}`);
    lines.push(`                    ${f.detail}`);
    if (f.inference) lines.push(`                    inference: ${f.inference}`);
  }

  if (collapseOk) {
    // Deliberately says nothing about WHY each one is ok: these findings come
    // from different checks (declaration match, explained change, plan mode),
    // and one sentence describing them all would over-claim for most of them.
    lines.push(`    [${LABEL.ok}] ${okCount} findings raised nothing`);
    lines.push("                    to see each of them: routeledger --all");
  }

  lines.push("");
  return lines.join("\n");
}
