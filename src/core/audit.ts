import { access, appendFile, mkdir, rename, stat, unlink } from "node:fs/promises";
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
  private readonly maxBytes: number;
  private readonly maxFiles: number;

  constructor(config: RuntimeConfig) {
    this.enabled = config.audit.enabled;
    this.filePath = path.resolve(process.cwd(), config.audit.file);
    this.maxBytes = config.audit.maxBytes;
    this.maxFiles = config.audit.maxFiles;
  }

  private async fileExists(targetPath: string): Promise<boolean> {
    try {
      await access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  private async rotateIfNeeded(nextRecordBytes: number): Promise<void> {
    if (!(await this.fileExists(this.filePath))) {
      return;
    }

    const current = await stat(this.filePath);
    if (current.size + nextRecordBytes <= this.maxBytes) {
      return;
    }

    if (this.maxFiles <= 0) {
      await unlink(this.filePath);
      return;
    }

    for (let index = this.maxFiles; index >= 1; index -= 1) {
      const source = index === 1 ? this.filePath : `${this.filePath}.${index - 1}`;
      const destination = `${this.filePath}.${index}`;
      if (!(await this.fileExists(source))) {
        continue;
      }
      if (await this.fileExists(destination)) {
        await unlink(destination);
      }
      await rename(source, destination);
    }
  }

  async append(event: AuditEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const record = `${JSON.stringify(event)}\n`;
    await this.rotateIfNeeded(Buffer.byteLength(record, "utf8"));
    await appendFile(this.filePath, record, "utf8");
  }

  getPath(): string {
    return this.filePath;
  }
}
