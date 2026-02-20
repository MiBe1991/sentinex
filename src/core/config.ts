import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export type ApprovalMode = "prompt" | "auto-approve" | "auto-deny";
export type LlmProviderName = "mock" | "openai";

export type RuntimeConfig = {
  version: number;
  audit: {
    enabled: boolean;
    file: string;
  };
  approval: {
    mode: ApprovalMode;
  };
  llm: {
    provider: LlmProviderName;
    fallbackToMock: boolean;
    model: string;
    baseUrl: string;
    apiKeyEnv: string;
    systemPrompt: string;
    timeoutMs: number;
    maxRetries: number;
    retryDelayMs: number;
    dryRunDefault: boolean;
  };
};

const DEFAULT_CONFIG: RuntimeConfig = {
  version: 1,
  audit: {
    enabled: true,
    file: ".sentinex/audit.jsonl",
  },
  approval: {
    mode: "prompt",
  },
  llm: {
    provider: "mock",
    fallbackToMock: false,
    model: "gpt-4.1-mini",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "OPENAI_API_KEY",
    systemPrompt:
      "Return JSON only. Build an action plan with shape: {\"actions\": [...]}. Allowed actions: respond, tool(http.fetch, fs.read).",
    timeoutMs: 20000,
    maxRetries: 2,
    retryDelayMs: 600,
    dryRunDefault: false,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Config must be an object.");
  }
  return value as Record<string, unknown>;
}

function asBoolean(value: unknown, fallback: boolean, keyName: string): boolean {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw new Error(`${keyName} must be a boolean.`);
  }
  return value;
}

function asNonNegativeInteger(value: unknown, fallback: number, keyName: string): number {
  if (value === undefined) {
    return fallback;
  }
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(`${keyName} must be a non-negative integer.`);
  }
  return value;
}

function asPositiveNumber(value: unknown, fallback: number, keyName: string): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${keyName} must be a positive number.`);
  }
  return value;
}

function asString(value: unknown, fallback: string, keyName: string): string {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${keyName} must be a non-empty string.`);
  }
  return value;
}

function asApprovalMode(value: unknown, fallback: ApprovalMode): ApprovalMode {
  if (value === undefined) {
    return fallback;
  }
  if (value !== "prompt" && value !== "auto-approve" && value !== "auto-deny") {
    throw new Error("approval.mode must be prompt, auto-approve, or auto-deny.");
  }
  return value;
}

export function validateConfig(raw: unknown): RuntimeConfig {
  const obj = asRecord(raw);
  if (obj.version !== 1) {
    throw new Error("Config version must be 1.");
  }

  const auditRoot = obj.audit === undefined ? {} : asRecord(obj.audit);
  const approvalRoot = obj.approval === undefined ? {} : asRecord(obj.approval);
  const llmRoot = obj.llm === undefined ? {} : asRecord(obj.llm);

  const provider = llmRoot.provider;
  if (provider !== undefined && provider !== "mock" && provider !== "openai") {
    throw new Error("llm.provider must be 'mock' or 'openai'.");
  }

  return {
    version: 1,
    audit: {
      enabled: asBoolean(auditRoot.enabled, DEFAULT_CONFIG.audit.enabled, "audit.enabled"),
      file: asString(auditRoot.file, DEFAULT_CONFIG.audit.file, "audit.file"),
    },
    approval: {
      mode: asApprovalMode(approvalRoot.mode, DEFAULT_CONFIG.approval.mode),
    },
    llm: {
      provider: (provider as LlmProviderName | undefined) ?? DEFAULT_CONFIG.llm.provider,
      fallbackToMock: asBoolean(
        llmRoot.fallbackToMock,
        DEFAULT_CONFIG.llm.fallbackToMock,
        "llm.fallbackToMock",
      ),
      model: asString(llmRoot.model, DEFAULT_CONFIG.llm.model, "llm.model"),
      baseUrl: asString(llmRoot.baseUrl, DEFAULT_CONFIG.llm.baseUrl, "llm.baseUrl"),
      apiKeyEnv: asString(llmRoot.apiKeyEnv, DEFAULT_CONFIG.llm.apiKeyEnv, "llm.apiKeyEnv"),
      systemPrompt: asString(
        llmRoot.systemPrompt,
        DEFAULT_CONFIG.llm.systemPrompt,
        "llm.systemPrompt",
      ),
      timeoutMs: asPositiveNumber(llmRoot.timeoutMs, DEFAULT_CONFIG.llm.timeoutMs, "llm.timeoutMs"),
      maxRetries: asNonNegativeInteger(
        llmRoot.maxRetries,
        DEFAULT_CONFIG.llm.maxRetries,
        "llm.maxRetries",
      ),
      retryDelayMs: asPositiveNumber(
        llmRoot.retryDelayMs,
        DEFAULT_CONFIG.llm.retryDelayMs,
        "llm.retryDelayMs",
      ),
      dryRunDefault: asBoolean(
        llmRoot.dryRunDefault,
        DEFAULT_CONFIG.llm.dryRunDefault,
        "llm.dryRunDefault",
      ),
    },
  };
}

export async function loadConfigFromCwd(): Promise<RuntimeConfig> {
  const configPath = path.join(process.cwd(), ".sentinex", "config.yaml");
  try {
    await access(configPath);
  } catch {
    return DEFAULT_CONFIG;
  }

  const yaml = await readFile(configPath, "utf8");
  const parsed = parse(yaml);
  return validateConfig(parsed);
}
