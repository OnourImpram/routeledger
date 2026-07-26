import { LAST_TESTED_CC_VERSION } from "./models.js";
import type { Finding } from "./types.js";

export interface Report {
  slug: string;
  sessionId: string;
  usedFallback: boolean;
  versions: string[];
  beyondFence: boolean;
  /** true ise kayitlarin hicbirinde CC surum alani yok — cit yine kapanir. */
  versionsUnknown?: boolean;
  modelTotals: Record<string, number>;
  findings: Finding[];
  /** true ise uyumlu bulgular da tek tek yazilir. */
  showAll?: boolean;
}

/** Cit kapali mi: dogrulanmamis surum YA DA surum bilgisi hic yok. */
function fenced(r: Report): boolean {
  return r.beyondFence || r.versionsUnknown === true;
}

/** Once dikkat isteyenler. Ayni oncelikteki bulgularin sirasi korunur. */
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
 * Surum citi: dogrulanmamis bir CC surumunde hicbir iddia uretilmez.
 * mismatch/ok/observation unverifiable'a duser; uretilMEyen iddia detayda
 * saklanir ki kullanici neyin geri cekildigini gorsun. Zaten unverifiable
 * olan oldugu gibi kalir.
 */
export function degradeBeyondFence(findings: Finding[]): Finding[] {
  return findings.map((f) =>
    f.status === "unverifiable"
      ? f
      : {
          ...f,
          status: "unverifiable" as const,
          detail: `${f.detail} (surum citi: dogrulanmamis surum, "${f.status}" iddiasi uretilmedi)`,
        }
  );
}

/** Makine-okunur rapor. Metin ciktinin aksine daima TUM bulgulari icerir. */
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
        },
        /** fenced=true ise modelsServed ham sayimdir, dogrulanmis olay degil. */
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
  lines.push(`  project: ${r.slug}${r.usedFallback ? "  (cwd eslesmedi; en son oturum secildi)" : ""}`);
  lines.push(`  claude code: ${r.versions.join(", ") || "bilinmiyor"}`);
  lines.push("");

  if (r.beyondFence) {
    lines.push(
      `  ! Bu oturum routeledger'in dogrulandigi surumden (${LAST_TESTED_CC_VERSION}) yeni.`
    );
    lines.push("    Bulgular unverifiable sayilir; transcript formati degismis olabilir.");
    lines.push("");
  } else if (r.versionsUnknown === true) {
    lines.push("  ! Kayitlarin hicbirinde Claude Code surum alani yok.");
    lines.push("    Format dogrulanamiyor; bulgular unverifiable sayilir.");
    lines.push("");
  }

  lines.push(fenced(r) ? "  MODELS SERVED (ham sayim — format dogrulanmadi)" : "  MODELS SERVED");
  const entries = Object.entries(r.modelTotals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) lines.push("    (kayit yok)");
  for (const [model, count] of entries) {
    lines.push(`    ${model.padEnd(28)} ${String(count).padStart(6)} turn`);
  }
  lines.push("");

  lines.push("  FINDINGS");
  if (r.findings.length === 0) lines.push("    (bulgu yok)");

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
    if (f.inference) lines.push(`                    cikarim: ${f.inference}`);
  }

  if (collapseOk) {
    lines.push(`    [${LABEL.ok}] ${okCount} bulgu uyumlu — beyan edilen model ile fiilen kosan ayni`);
    lines.push("                    hepsini gormek icin: routeledger --all");
  }

  lines.push("");
  return lines.join("\n");
}
