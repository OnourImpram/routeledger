export type Status = "ok" | "mismatch" | "unverifiable" | "observation";

export interface Finding {
  check: "subagent-model" | "model-change" | "plan-mode";
  status: Status;
  title: string;
  detail: string;
  /** Cikarima dayanan bulgular burada acikca isaretlenir. */
  inference?: string;
}

export interface SessionRef {
  slug: string;
  sessionId: string;
  mainPath: string;
  subagentDir: string;
  mtimeMs: number;
}
