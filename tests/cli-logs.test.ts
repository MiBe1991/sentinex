import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filterAuditEvents, readAuditEvents } from "../src/cli.js";
import { validateConfig } from "../src/core/config.js";

const tempDir = path.resolve(process.cwd(), ".tmp-cli-logs-tests");

describe("filterAuditEvents", () => {
  const events = [
    { type: "run.started", runId: "a", timestamp: "2026-02-20T08:00:00Z" },
    { type: "policy.decision", runId: "a", timestamp: "2026-02-20T08:05:00Z" },
    { type: "run.finished", runId: "b", timestamp: "2026-02-20T09:00:00Z" },
  ];

  it("filters by since and until bounds", () => {
    const filtered = filterAuditEvents(events, {
      since: "2026-02-20T08:01:00Z",
      until: "2026-02-20T08:59:00Z",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.type).toBe("policy.decision");
  });

  it("filters by runId and type", () => {
    const filtered = filterAuditEvents(events, {
      runId: "a",
      type: "run.started",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.runId).toBe("a");
  });

  it("throws on invalid until date", () => {
    expect(() => filterAuditEvents(events, { until: "not-a-date" })).toThrow(
      "Invalid --until date",
    );
  });
});

describe("readAuditEvents", () => {
  it("merges rotated audit files in chronological order", async () => {
    await rm(tempDir, { recursive: true, force: true });
    await mkdir(tempDir, { recursive: true });

    const base = path.join(tempDir, "audit.jsonl");
    await writeFile(
      `${base}.1`,
      `${JSON.stringify({ type: "older", runId: "r1", timestamp: "2026-02-20T08:00:00Z" })}\n`,
      "utf8",
    );
    await writeFile(
      base,
      `${JSON.stringify({ type: "newer", runId: "r2", timestamp: "2026-02-20T09:00:00Z" })}\n`,
      "utf8",
    );

    const config = validateConfig({
      version: 1,
      audit: {
        enabled: true,
        file: path.relative(process.cwd(), base),
        maxFiles: 2,
      },
    });
    const events = await readAuditEvents(config);
    expect(events).toHaveLength(2);
    expect(events[0]?.type).toBe("older");
    expect(events[1]?.type).toBe("newer");

    await rm(tempDir, { recursive: true, force: true });
  });
});
