import { describe, expect, it } from "vitest";
import { validateActionPlan } from "../src/core/actions.js";
import { ActionPlanValidationError } from "../src/core/errors.js";

describe("validateActionPlan", () => {
  it("accepts a respond action", () => {
    const result = validateActionPlan({
      actions: [{ type: "respond", text: "ok" }],
    });
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0]).toEqual({ type: "respond", text: "ok" });
  });

  it("accepts tool actions", () => {
    const result = validateActionPlan({
      actions: [
        { type: "tool", tool: "http.fetch", input: { url: "https://example.com" } },
        { type: "tool", tool: "fs.read", input: { path: "README.md" } },
      ],
    });
    expect(result.actions).toHaveLength(2);
  });

  it("rejects invalid plans", () => {
    expect(() => validateActionPlan({ actions: [{ type: "tool", tool: "exec", input: {} }] })).toThrow(
      ActionPlanValidationError,
    );
  });
});
