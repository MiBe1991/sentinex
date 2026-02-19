import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";

export type ApprovalMode = "prompt" | "auto-approve" | "auto-deny";

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
    provider: "mock";
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
  if (provider !== undefined && provider !== "mock") {
    throw new Error("llm.provider must be 'mock'.");
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
      provider: "mock",
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
