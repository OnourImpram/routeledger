import { readJsonl } from "../jsonl.js";
import type { Finding } from "../types.js";

/**
 * Plan modundaki turn'leri servis eden modeller ile plan disi turn'leri
 * servis edenleri karsilastirir.
 *
 * Mod bilgisi KULLANICI turn'undeki permissionMode alanindan alinir;
 * bagimsiz type:"permission-mode" kayitlarinda zaman damgasi ve uuid yoktur
 * (2026-07-26'da olculdu), o yuzden onlara guvenilmez.
 */
export async function checkPlanMode(mainPath: string): Promise<Finding> {
  const planModels = new Set<string>();
  const otherModels = new Set<string>();
  let mode: string | null = null;

  for await (const rec of readJsonl(mainPath)) {
    if (rec["type"] === "user") {
      const pm = rec["permissionMode"];
      if (typeof pm === "string") mode = pm;
      continue;
    }
    if (rec["type"] !== "assistant") continue;

    const msg = rec["message"];
    if (typeof msg !== "object" || msg === null) continue;
    const model = (msg as Record<string, unknown>)["model"];
    if (typeof model !== "string" || model === "<synthetic>") continue;

    if (mode === "plan") planModels.add(model);
    else otherModels.add(model);
  }

  if (planModels.size === 0) {
    return {
      check: "plan-mode",
      status: "unverifiable",
      title: "plan modu profili",
      detail: "bu oturumda plan modunda kaydedilmis turn yok",
    };
  }

  const plan = [...planModels].sort();
  const other = [...otherModels].sort();
  const identical = other.length > 0 && plan.length === other.length && plan.every((m, i) => m === other[i]);

  return {
    check: "plan-mode",
    status: identical ? "observation" : "ok",
    title: "plan modu profili",
    detail: `plan: ${plan.join(", ") || "-"} | uygulama: ${other.join(", ") || "-"}`,
    inference: identical
      ? "plan ve uygulama ayni modelde; bir plan-modu yukseltmesi bekliyorduysan ateslememis olabilir. Oturum anindaki yapilandirma transcript'e kaydedilmedigi icin bu bir gozlemdir, hukum degil"
      : undefined,
  };
}
