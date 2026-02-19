import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import type { RuntimeConfig } from "./config.js";

export type AuditEvent =
  | { type: "run.started"; runId: string; prompt: string; dryRun: boolean; timestamp: string }
  | { type: "action.requested"; runId: string; action: unknown; timestamp: string }
  | {
      type: "policy.decision";
      runId: string;
      allowed: boolean;
      reason: string;
      action: unknown;
      timestamp: string;
    }
  | {
      type: "action.result";
      runId: string;
      success: boolean;
      result: unknown;
      action: unknown;
      timestamp: string;
    }
  | { type: "run.finished"; runId: string; status: "ok" | "error"; timestamp: string };

export class AuditLogger {
  private readonly enabled: boolean;
  private readonly filePath: string;

  constructor(config: RuntimeConfig) {
    this.enabled = config.audit.enabled;
    this.filePath = path.resolve(process.cwd(), config.audit.file);
  }

  async append(event: AuditEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
  }

  getPath(): string {
    return this.filePath;
  }
}
