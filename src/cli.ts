import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { executePrompt } from "./core/agent.js";
import { loadConfigFromCwd } from "./core/config.js";
import {
  loadPolicyFromCwd,
  evaluatePrompt,
  evaluatePromptDetailed,
  evaluateTool,
} from "./core/policy.js";
import { AuditLogger } from "./core/audit.js";

type AuditEventLine = {
  type?: string;
  timestamp?: string;
  runId?: string;
  [key: string]: unknown;
};

type DoctorCheckName =
  | "config.load"
  | "policy.load"
  | "audit.path"
  | "llm.apiKey"
  | "llm.provider"
  | "doctor.runtime";

type DoctorCheck = {
  name: DoctorCheckName;
  ok: boolean;
  detail: string;
  level: "error" | "warning";
};

const DOCTOR_EXIT_CODES: Record<DoctorCheckName, number> = {
  "config.load": 2,
  "policy.load": 4,
  "audit.path": 8,
  "llm.apiKey": 16,
  "llm.provider": 0,
  "doctor.runtime": 32,
};
const DOCTOR_STRICT_WARNING_EXIT_CODE = 64;

export function parseAuditLines(raw: string): AuditEventLine[] {
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

export function filterAuditEvents(
  events: AuditEventLine[],
  options: { runId?: string; type?: string; since?: string; until?: string },
): AuditEventLine[] {
  let filtered = events;
  if (options.runId) {
    filtered = filtered.filter((event) => event.runId === options.runId);
  }
  if (options.type) {
    filtered = filtered.filter((event) => event.type === options.type);
  }
  if (options.since) {
    const sinceMs = Date.parse(options.since);
    if (Number.isNaN(sinceMs)) {
      throw new Error(`Invalid --since date: ${options.since}`);
    }
    filtered = filtered.filter((event) => {
      if (!event.timestamp || typeof event.timestamp !== "string") {
        return false;
      }
      const eventMs = Date.parse(event.timestamp);
      return !Number.isNaN(eventMs) && eventMs >= sinceMs;
    });
  }
  if (options.until) {
    const untilMs = Date.parse(options.until);
    if (Number.isNaN(untilMs)) {
      throw new Error(`Invalid --until date: ${options.until}`);
    }
    filtered = filtered.filter((event) => {
      if (!event.timestamp || typeof event.timestamp !== "string") {
        return false;
      }
      const eventMs = Date.parse(event.timestamp);
      return !Number.isNaN(eventMs) && eventMs <= untilMs;
    });
  }
  return filtered;
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
      const details = evaluatePromptDetailed(options.prompt, policy);
      console.log(
        JSON.stringify(
          {
            target: "prompt",
            ...details.decision,
            stage: details.stage,
            matchedPattern: details.matchedPattern,
            invalidPattern: details.invalidPattern,
          },
          null,
          2,
        ),
      );
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
  since?: string;
  until?: string;
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
    events = filterAuditEvents(events, options);

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

export async function logsExportCLI(options: {
  output: string;
  format?: "json" | "jsonl";
  runId?: string;
  type?: string;
  since?: string;
  until?: string;
}) {
  try {
    const config = await loadConfigFromCwd();
    const auditPath = path.resolve(process.cwd(), config.audit.file);
    const raw = await readFile(auditPath, "utf8");
    let events = parseAuditLines(raw);
    events = filterAuditEvents(events, options);

    const outputPath = path.resolve(process.cwd(), options.output);
    const format = options.format ?? "json";
    if (format === "jsonl") {
      const payload = events.map((event) => JSON.stringify(event)).join("\n");
      await writeFile(outputPath, `${payload}\n`, "utf8");
    } else {
      await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");
    }
    console.log(`Exported ${events.length} events to ${outputPath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown logs export error.";
    console.error(`Logs export failed: ${message}`);
  }
}

export async function doctorCLI(options: { json?: boolean; strict?: boolean } = {}) {
  const checks: DoctorCheck[] = [];
  try {
    const config = await loadConfigFromCwd();
    checks.push({ name: "config.load", ok: true, detail: "config.yaml is valid", level: "error" });

    const policy = await loadPolicyFromCwd();
    checks.push({
      name: "policy.load",
      ok: true,
      detail: `policy default=${policy.default}, allowPrompts=${policy.allow.prompts.length}, denyPrompts=${policy.deny.prompts.length}`,
      level: "error",
    });
    if (policy.allow.prompts.includes(".*")) {
      checks.push({
        name: "policy.load",
        ok: true,
        detail: "allow.prompts contains '.*' (very broad allow rule)",
        level: "warning",
      });
    }
    if (
      policy.allow.tools["http.fetch"].enabled &&
      policy.allow.tools["http.fetch"].hosts.some((host) => host.trim() === "*")
    ) {
      checks.push({
        name: "policy.load",
        ok: true,
        detail: "http.fetch host allowlist contains '*' (overly broad)",
        level: "warning",
      });
    }
    if (
      policy.allow.tools["fs.read"].enabled &&
      policy.allow.tools["fs.read"].roots.some((root) => {
        const normalized = root.trim();
        return normalized === "." || normalized === "./" || normalized === "/";
      })
    ) {
      checks.push({
        name: "policy.load",
        ok: true,
        detail: "fs.read roots include project/global root (overly broad)",
        level: "warning",
      });
    }
    if (policy.allow.tools["http.fetch"].maxBytes > 5_000_000) {
      checks.push({
        name: "policy.load",
        ok: true,
        detail: "http.fetch.maxBytes is very high (>5,000,000)",
        level: "warning",
      });
    }
    if (policy.allow.tools["fs.read"].maxBytes > 5_000_000) {
      checks.push({
        name: "policy.load",
        ok: true,
        detail: "fs.read.maxBytes is very high (>5,000,000)",
        level: "warning",
      });
    }

    const auditLogger = new AuditLogger(config);
    checks.push({
      name: "audit.path",
      ok: true,
      detail: `${auditLogger.getPath()} (maxBytes=${config.audit.maxBytes}, maxFiles=${config.audit.maxFiles})`,
      level: "error",
    });
    if (!config.audit.enabled) {
      checks.push({
        name: "audit.path",
        ok: true,
        detail: "audit logging is disabled",
        level: "warning",
      });
    }
    if (config.audit.maxBytes > 50_000_000) {
      checks.push({
        name: "audit.path",
        ok: true,
        detail: "audit.maxBytes is very high (>50,000,000)",
        level: "warning",
      });
    }

    if (config.llm.provider === "openai") {
      const hasKey = Boolean(process.env[config.llm.apiKeyEnv]);
      checks.push({
        name: "llm.apiKey",
        ok: hasKey,
        detail: hasKey
          ? `Environment variable ${config.llm.apiKeyEnv} is set`
          : `Environment variable ${config.llm.apiKeyEnv} is missing`,
        level: "error",
      });
      if (config.llm.fallbackToMock) {
        checks.push({
          name: "llm.provider",
          ok: true,
          detail: "Fallback to mock is enabled",
          level: "warning",
        });
      }
    } else {
      checks.push({
        name: "llm.provider",
        ok: true,
        detail: "Using mock provider",
        level: "warning",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown doctor error.";
    checks.push({
      name: "doctor.runtime",
      ok: false,
      detail: message,
      level: "error",
    });
  }

  let exitCode = 0;
  const failedChecks: DoctorCheck[] = [];
  const warningChecks: DoctorCheck[] = [];
  for (const check of checks) {
    if (!check.ok) {
      failedChecks.push(check);
      exitCode |= DOCTOR_EXIT_CODES[check.name];
    } else if (check.level === "warning") {
      warningChecks.push(check);
    }
  }
  if (options.strict && warningChecks.length > 0) {
    exitCode |= DOCTOR_STRICT_WARNING_EXIT_CODE;
  }

  if (options.json) {
    console.log(
      JSON.stringify(
        {
            ok: failedChecks.length === 0 && (!options.strict || warningChecks.length === 0),
            strict: Boolean(options.strict),
            exitCode,
            checks,
        },
        null,
        2,
      ),
    );
  } else {
    for (const check of checks) {
      const label = check.ok ? (check.level === "warning" ? "WARN" : "OK") : "FAIL";
      console.log(`${label} ${check.name}: ${check.detail}`);
    }
  }

  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}
