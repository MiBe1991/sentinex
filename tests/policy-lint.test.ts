import { describe, expect, it } from "vitest";
import { lintPolicy, normalizePolicy } from "../src/cli.js";
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

  it("normalizes policy by deduping repeated arrays while preserving order", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        prompts: ["secret", "secret", "token"],
        tools: {
          "http.fetch": {
            hosts: ["bad.example.com", "bad.example.com"],
          },
          "fs.read": {
            paths: ["secrets", "secrets", "tmp"],
          },
        },
      },
      allow: {
        prompts: ["hello", "hello", "world"],
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: ["api.example.com", "api.example.com", "*.example.com"],
          },
          "fs.read": {
            enabled: true,
            roots: ["docs", "docs", "src"],
          },
        },
      },
    });

    const normalized = normalizePolicy(policy);
    expect(normalized.deny.prompts).toEqual(["secret", "token"]);
    expect(normalized.deny.tools["http.fetch"].hosts).toEqual(["bad.example.com"]);
    expect(normalized.deny.tools["fs.read"].paths).toEqual(["secrets", "tmp"]);
    expect(normalized.allow.prompts).toEqual(["hello", "world"]);
    expect(normalized.allow.tools["http.fetch"].hosts).toEqual(["api.example.com", "*.example.com"]);
    expect(normalized.allow.tools["fs.read"].roots).toEqual(["docs", "src"]);
  });
});
