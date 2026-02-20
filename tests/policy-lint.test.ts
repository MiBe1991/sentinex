import { describe, expect, it } from "vitest";
import { lintPolicy } from "../src/cli.js";
import { validatePolicy } from "../src/core/policy.js";

describe("policy lint", () => {
  it("emits warnings for broad prompt and fs roots", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        prompts: [".*"],
        tools: {
          "fs.read": {
            enabled: true,
            roots: ["."],
          },
        },
      },
    });

    const findings = lintPolicy(policy);
    expect(findings.some((finding) => finding.code === "PROMPT_ALLOW_ALL")).toBe(true);
    expect(findings.some((finding) => finding.code === "FS_READ_ROOT_TOO_BROAD")).toBe(true);
  });

  it("emits errors when enabled tools miss allow-list config", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: [],
          },
          "fs.read": {
            enabled: true,
            roots: [],
          },
        },
      },
    });

    const findings = lintPolicy(policy);
    expect(findings.some((finding) => finding.code === "HTTP_FETCH_NO_HOSTS")).toBe(true);
    expect(findings.some((finding) => finding.code === "FS_READ_NO_ROOTS")).toBe(true);
  });
});
