import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const nodeExe = process.execPath;
const cliEntry = path.resolve(repoRoot, "bin/sentinex.js");
let tempWorkspace = "";

function runCli(args: string[], cwd: string): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(nodeExe, [cliEntry, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

beforeAll(async () => {
  const tscEntry = path.resolve(repoRoot, "node_modules", "typescript", "bin", "tsc");
  const build = spawnSync(nodeExe, [tscEntry], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    throw new Error(`Build failed before CLI tests: ${build.stderr || build.stdout}`);
  }

  tempWorkspace = await mkdtemp(path.join(os.tmpdir(), "sentinex-cli-"));
  await mkdir(path.join(tempWorkspace, ".sentinex"), { recursive: true });

  await writeFile(
    path.join(tempWorkspace, ".sentinex", "policy.yaml"),
    `version: 1
default: deny
deny:
  prompts:
    - ".*blocked.*"
  tools:
    http.fetch:
      hosts: []
    fs.read:
      paths: []
allow:
  prompts:
    - ".*"
  tools:
    http.fetch:
      enabled: false
      hosts: []
      timeoutMs: 5000
      maxBytes: 64000
    fs.read:
      enabled: false
      roots: []
      maxBytes: 64000
    exec:
      enabled: false
`,
    "utf8",
  );

  await writeFile(
    path.join(tempWorkspace, ".sentinex", "config.yaml"),
    `version: 1
audit:
  enabled: true
  file: ".sentinex/audit.jsonl"
  maxBytes: 1000000
  maxFiles: 2
approval:
  mode: "auto-approve"
llm:
  provider: "mock"
  fallbackToMock: false
  model: "gpt-4.1-mini"
  baseUrl: "https://api.openai.com/v1"
  apiKeyEnv: "OPENAI_API_KEY"
  systemPrompt: "Return JSON only."
  timeoutMs: 20000
  maxRetries: 2
  retryDelayMs: 600
  dryRunDefault: false
`,
    "utf8",
  );
});

afterAll(async () => {
  if (tempWorkspace) {
    await rm(tempWorkspace, { recursive: true, force: true });
  }
});

describe("cli blackbox", () => {
  it("doctor --strict returns non-zero with warnings", () => {
    const result = runCli(["doctor", "--strict", "--json"], tempWorkspace);
    expect(result.status).toBe(64);
    expect(result.stdout).toContain('"strict": true');
  });

  it("policy test applies deny precedence", () => {
    const result = runCli(["policy", "test", "--prompt", "this is blocked"], tempWorkspace);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"allowed": false');
    expect(result.stdout).toContain("deny");
  });

  it("policy lint fails on warnings with fail-on warn", () => {
    const result = runCli(["policy", "lint", "--fail-on", "warn", "--json"], tempWorkspace);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"findings"');
  });
});
