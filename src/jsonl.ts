import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Bir JSONL dosyasini satir satir akitir. Transcript'ler 200MB+ olabilir;
 * dosya asla butunuyle bellege alinmaz. Bozuk satirlar sessizce atlanir.
 */
export async function* readJsonl(path: string): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({
    input: createReadStream(path, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    try {
      yield JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      continue;
    }
  }
}
