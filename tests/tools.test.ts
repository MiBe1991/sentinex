import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validatePolicy } from "../src/core/policy.js";
import { runFsRead } from "../src/core/tools/fsRead.js";
import { runHttpFetch } from "../src/core/tools/httpFetch.js";

const tempDir = path.resolve(process.cwd(), ".tmp-tool-tests");

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("tools", () => {
  it("fs.read returns truncated content when maxBytes is exceeded", async () => {
    const allowedRoot = path.join(tempDir, "allowed");
    await mkdir(allowedRoot, { recursive: true });
    const filePath = path.join(allowedRoot, "big.txt");
    await writeFile(filePath, "abcdef", "utf8");

    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "fs.read": {
            enabled: true,
            roots: [path.relative(process.cwd(), allowedRoot)],
            maxBytes: 3,
          },
        },
      },
    });

    const result = await runFsRead({ path: path.relative(process.cwd(), filePath) }, policy);
    expect(result.truncated).toBe(true);
    expect(result.content).toBe("abc");
  });

  it("http.fetch applies size limit and returns status", async () => {
    const policy = validatePolicy({
      version: 1,
      default: "deny",
      allow: {
        tools: {
          "http.fetch": {
            enabled: true,
            hosts: ["example.com"],
            maxBytes: 4,
            timeoutMs: 1000,
          },
        },
      },
    });

    const mockFetch = vi.fn(async () => new Response("123456", { status: 200 }));
    const result = await runHttpFetch(
      { url: "https://example.com" },
      policy,
      mockFetch as unknown as typeof fetch,
    );

    expect(result.status).toBe(200);
    expect(result.body).toBe("1234");
    expect(result.truncated).toBe(true);
  });
});
