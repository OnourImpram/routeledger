import { readJsonl } from "../jsonl.js";
import type { Finding } from "../types.js";

const MODEL_COMMAND = /<command-name>\/model<\/command-name>/;

function userText(rec: Record<string, unknown>): string {
  const msg = rec["message"];
  if (typeof msg !== "object" || msg === null) return "";
  const content = (msg as Record<string, unknown>)["content"];
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((b) =>
      typeof b === "object" && b !== null && (b as Record<string, unknown>)["type"] === "text"
        ? String((b as Record<string, unknown>)["text"] ?? "")
        : ""
    )
    .join(" ");
}

/**
 * Oturum boyunca servis eden modelin degistigi noktalari bulur.
 *
 * "Kullanici eylemi yok" bir CIKARIMDIR: oturum ortasindaki settings.json
 * duzenlemesi veya resume transcript'e kaydedilmez. Bulgu oyle etiketlenir.
 *
 * GIZLILIK: bu kontrol kullanici metnini yalnizca /model isaretini aramak icin
 * bellekte tarar. Taranan metin hicbir bulguya girmez, hicbir yere yazilmaz.
 * userText()'in dondurdugu deger yalnizca MODEL_COMMAND regex'ine verilir.
 */
export async function checkModelChange(mainPath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  let current: string | null = null;
  let modelCommandSincePrevious = false;

  for await (const rec of readJsonl(mainPath)) {
    if (rec["type"] === "user" && MODEL_COMMAND.test(userText(rec))) {
      modelCommandSincePrevious = true;
      continue;
    }
    if (rec["type"] !== "assistant") continue;

    const msg = rec["message"];
    if (typeof msg !== "object" || msg === null) continue;
    const model = (msg as Record<string, unknown>)["model"];
    if (typeof model !== "string" || model === "<synthetic>") continue;

    if (current === null) {
      current = model;
      continue;
    }
    if (model === current) continue;

    const ts = typeof rec["timestamp"] === "string" ? rec["timestamp"] : "zaman damgasi yok";
    findings.push(
      modelCommandSincePrevious
        ? {
            check: "model-change",
            status: "ok",
            title: "model degisimi (aciklanmis)",
            detail: `${current} -> ${model} @ ${ts}; oncesinde /model komutu var`,
          }
        : {
            check: "model-change",
            status: "observation",
            title: "aciklanmamis model degisimi",
            detail: `${current} -> ${model} @ ${ts}`,
            inference:
              "kullanici eylemi bulunamadi; ancak oturum-ici settings.json duzenlemesi ve resume transcript'e kaydedilmez, dolayisiyla bu bir hipotezdir",
          }
    );
    current = model;
    modelCommandSincePrevious = false;
  }

  return findings;
}
