import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { executePrompt } from "./core/agent.js";
import { loadConfigFromCwd } from "./core/config.js";
import { loadPolicyFromCwd, evaluatePrompt, evaluateTool } from "./core/policy.js";
import { AuditLogger } from "./core/audit.js";

type AuditEventLine = {
  type?: string;
  timestamp?: string;
  runId?: string;
  [key: string]: unknown;
};

function parseAuditLines(raw: string): AuditEventLine[] {
  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line) as AuditEventLine;
      } catch {
        return { type: "invalid.jsonl", raw: line };
      }
    })
    .filter((event) => typeof event === "object");
}

export async function runCLI(prompt: string, options: { dryRun?: boolean } = {}) {
  console.log(`>>> Prompt: ${prompt}`);

  try {
    const result = await executePrompt(prompt, { dryRun: options.dryRun });
    console.log(`Run ID: ${result.runId}`);
    for (const output of result.outputs) {
      console.log("Result:", output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error.";
    console.error(`Run failed: ${message}`);
  }
}

export async function policyTestCLI(options: {
  prompt?: string;
  tool?: string;
  url?: string;
  filePath?: string;
}) {
  try {
    const policy = await loadPolicyFromCwd();

    if (options.prompt) {
      const decision = evaluatePrompt(options.prompt, policy);
      console.log(JSON.stringify({ target: "prompt", ...decision }, null, 2));
      return;
    }

    if (options.tool === "http.fetch" && options.url) {
      const decision = evaluateTool("http.fetch", { url: options.url }, policy);
      console.log(
        JSON.stringify({ target: "http.fetch", input: { url: options.url }, ...decision }, null, 2),
      );
      return;
    }

    if (options.tool === "fs.read" && options.filePath) {
      const decision = evaluateTool("fs.read", { path: options.filePath }, policy);
      console.log(
        JSON.stringify({ target: "fs.read", input: { path: options.filePath }, ...decision }, null, 2),
      );
      return;
    }

    console.error(
      "Usage: sentinex policy test --prompt <text> | --tool http.fetch --url <url> | --tool fs.read --path <path>",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown policy test error.";
    console.error(`Policy test failed: ${message}`);
  }
}

export async function logsShowCLI(options: {
  limit?: number;
  json?: boolean;
  runId?: string;
  type?: string;
}) {
  try {
    const config = await loadConfigFromCwd();
    const filePath = path.resolve(process.cwd(), config.audit.file);

    try {
      await access(filePath);
    } catch {
      console.log(`No audit log found at ${filePath}`);
      return;
    }

    const raw = await readFile(filePath, "utf8");
    let events = parseAuditLines(raw);
    if (options.runId) {
      events = events.filter((event) => event.runId === options.runId);
    }
    if (options.type) {
      events = events.filter((event) => event.type === options.type);
    }

    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const selected = events.slice(-limit);

    if (options.json) {
      console.log(JSON.stringify(selected, null, 2));
      return;
    }

    for (const event of selected) {
      console.log(`${event.timestamp ?? "-"} ${event.type ?? "event"} ${event.runId ?? ""}`.trim());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown logs error.";
    console.error(`Logs show failed: ${message}`);
  }
}

export async function doctorCLI() {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  try {
    const config = await loadConfigFromCwd();
    checks.push({ name: "config.load", ok: true, detail: "config.yaml is valid" });

    const policy = await loadPolicyFromCwd();
    checks.push({
      name: "policy.load",
      ok: true,
      detail: `policy default=${policy.default}, prompts=${policy.allow.prompts.length}`,
    });

    const auditLogger = new AuditLogger(config);
    checks.push({
      name: "audit.path",
      ok: true,
      detail: auditLogger.getPath(),
    });

    if (config.llm.provider === "openai") {
      const hasKey = Boolean(process.env[config.llm.apiKeyEnv]);
      checks.push({
        name: "llm.apiKey",
        ok: hasKey,
        detail: hasKey
          ? `Environment variable ${config.llm.apiKeyEnv} is set`
          : `Environment variable ${config.llm.apiKeyEnv} is missing`,
      });
    } else {
      checks.push({
        name: "llm.provider",
        ok: true,
        detail: "Using mock provider",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown doctor error.";
    checks.push({
      name: "doctor.runtime",
      ok: false,
      detail: message,
    });
  }

  let hasFailure = false;
  for (const check of checks) {
    if (!check.ok) {
      hasFailure = true;
    }
    console.log(`${check.ok ? "OK" : "FAIL"} ${check.name}: ${check.detail}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}
