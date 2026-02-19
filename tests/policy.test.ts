import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  evaluateFsRead,
  evaluateHttpFetch,
  evaluatePrompt,
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
      allow: {
        prompts: ["^hello"],
      },
    });

    expect(evaluatePrompt("hello world", policy).allowed).toBe(true);
    expect(evaluatePrompt("bye", policy).allowed).toBe(false);
  });

  it("checks http.fetch host allowlist", () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "http.fetch": {
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
            roots: [relativeAllowedRoot],
          },
        },
      },
    });

    const allowedPath = path.relative(process.cwd(), path.join(allowedRoot, "data.txt"));
    expect(evaluateFsRead({ path: allowedPath }, policy).allowed).toBe(true);
    expect(evaluateFsRead({ path: "README.md" }, policy).allowed).toBe(false);
  });
});
