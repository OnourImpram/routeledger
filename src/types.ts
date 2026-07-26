export type Status = "ok" | "mismatch" | "unverifiable" | "observation";

export interface Finding {
  check: "subagent-model" | "model-change" | "plan-mode";
  status: Status;
  title: string;
  detail: string;
  /** Findings that rest on inference are marked here, explicitly. */
  inference?: string;
}

export interface SessionRef {
  slug: string;
  sessionId: string;
  mainPath: string;
  subagentDir: string;
  mtimeMs: number;
}
