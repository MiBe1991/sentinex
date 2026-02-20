import { describe, expect, it } from "vitest";
import { filterAuditEvents } from "../src/cli.js";

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
