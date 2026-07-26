import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

/**
 * Streams a JSONL file line by line. Transcripts can exceed 200MB, so the
 * file is never held in memory whole. Malformed lines are skipped.
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
