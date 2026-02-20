import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  evaluateFsRead,
  evaluateHttpFetch,
  evaluatePrompt,
  evaluatePromptDetailed,
  validatePolicy,
} from "../src/core/policy.js";

const tempDir = path.resolve(process.cwd(), ".tmp-tests");

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("policy", () => {
  it("validates and evaluates prompt patterns", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        prompts: ["forbidden"],
      },
      allow: {
        prompts: ["^hello"],
      },
    });

    expect(evaluatePrompt("hello world", policy).allowed).toBe(true);
    expect(evaluatePrompt("bye", policy).allowed).toBe(false);
    expect(evaluatePrompt("this is forbidden", policy).allowed).toBe(false);
  });

  it("prioritizes deny over allow patterns", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        prompts: [".*secret.*"],
      },
      allow: {
        prompts: [".*"],
      },
    });

    const decision = evaluatePrompt("show secret data", policy);
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("deny");
  });

  it("returns prompt evaluation details", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        prompts: ["^blocked"],
      },
      allow: {
        prompts: ["^hello"],
      },
    });

    const denyDetails = evaluatePromptDetailed("blocked request", policy);
    expect(denyDetails.stage).toBe("deny");
    expect(denyDetails.matchedPattern).toBe("^blocked");

    const allowDetails = evaluatePromptDetailed("hello world", policy);
    expect(allowDetails.stage).toBe("allow");
    expect(allowDetails.matchedPattern).toBe("^hello");
  });

  it("checks http.fetch host allowlist", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: ["example.com"],
          },
        },
      },
    });

    expect(evaluateHttpFetch({ url: "https://example.com/a" }, policy).allowed).toBe(true);
    expect(evaluateHttpFetch({ url: "https://blocked.test" }, policy).allowed).toBe(false);
  });

  it("checks fs.read roots", async () => {
    const allowedRoot = path.join(tempDir, "allowed");
    await mkdir(allowedRoot, { recursive: true });
    await writeFile(path.join(allowedRoot, "data.txt"), "ok", "utf8");

    const relativeAllowedRoot = path.relative(process.cwd(), allowedRoot);
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "fs.read": {
            enabled: true,
            roots: [relativeAllowedRoot],
          },
        },
      },
    });

    const allowedPath = path.relative(process.cwd(), path.join(allowedRoot, "data.txt"));
    expect(evaluateFsRead({ path: allowedPath }, policy).allowed).toBe(true);
    expect(evaluateFsRead({ path: "README.md" }, policy).allowed).toBe(false);
  });

  it("supports wildcard host matching for http.fetch", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: ["*.example.com"],
          },
        },
      },
    });

    expect(evaluateHttpFetch({ url: "https://api.example.com" }, policy).allowed).toBe(true);
    expect(evaluateHttpFetch({ url: "https://example.com" }, policy).allowed).toBe(false);
  });

  it("prioritizes http.fetch deny hosts over allow hosts", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        tools: {
          "http.fetch": {
            hosts: ["blocked.example.com"],
          },
        },
      },
      allow: {
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: ["*.example.com"],
          },
        },
      },
    });

    const blocked = evaluateHttpFetch({ url: "https://blocked.example.com" }, policy);
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("deny");
  });

  it("prioritizes fs.read deny paths over allowed roots", async () => {
    const allowedRoot = path.join(tempDir, "allowed");
    const blockedPath = path.join(allowedRoot, "private");
    await mkdir(blockedPath, { recursive: true });
    await writeFile(path.join(blockedPath, "secret.txt"), "secret", "utf8");

    const policy = validatePolicy({
      version: 1,
      default: "deny",
      deny: {
        tools: {
          "fs.read": {
            paths: [path.relative(process.cwd(), blockedPath)],
          },
        },
      },
      allow: {
        tools: {
          "fs.read": {
            enabled: true,
            roots: [path.relative(process.cwd(), allowedRoot)],
          },
        },
      },
    });

    const blocked = evaluateFsRead(
      { path: path.relative(process.cwd(), path.join(blockedPath, "secret.txt")) },
      policy,
    );
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("deny");
  });
});
