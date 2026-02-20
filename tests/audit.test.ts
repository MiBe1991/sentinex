import { access, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AuditLogger } from "../src/core/audit.js";
import { validateConfig } from "../src/core/config.js";

const tempDir = path.resolve(process.cwd(), ".tmp-audit-tests");

async function exists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("AuditLogger", () => {
  it("rotates files when maxBytes is exceeded", async () => {
    await mkdir(tempDir, { recursive: true });
    const config = validateConfig({
      version: 1,
      audit: {
        enabled: true,
        file: path.relative(process.cwd(), path.join(tempDir, "audit.jsonl")),
        maxBytes: 180,
        maxFiles: 2,
      },
    });

    const logger = new AuditLogger(config);
    const eventTemplate = {
      type: "run.started" as const,
      runId: "run-1",
      prompt: "x".repeat(120),
      dryRun: false,
      timestamp: new Date().toISOString(),
    };

    await logger.append({ ...eventTemplate, runId: "run-1" });
    await logger.append({ ...eventTemplate, runId: "run-2" });
    await logger.append({ ...eventTemplate, runId: "run-3" });

    const basePath = path.join(tempDir, "audit.jsonl");
    const rotatedPath = path.join(tempDir, "audit.jsonl.1");
    expect(await exists(basePath)).toBe(true);
    expect(await exists(rotatedPath)).toBe(true);

    const baseContent = await readFile(basePath, "utf8");
    const rotatedContent = await readFile(rotatedPath, "utf8");
    expect(baseContent).toContain("run-3");
    expect(rotatedContent).toContain("run-2");
  });
});
