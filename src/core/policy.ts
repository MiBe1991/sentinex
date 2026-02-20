import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import type { FsReadInput, HttpFetchInput, ToolName } from "./actions.js";

export type PolicyDefault = "allow" | "deny";

export type ToolPolicyHttpFetch = {
  enabled: boolean;
  hosts: string[];
  timeoutMs: number;
  maxBytes: number;
};

export type ToolPolicyFsRead = {
  enabled: boolean;
  roots: string[];
  maxBytes: number;
};

export type ToolPolicyExec = {
  enabled: boolean;
};

export type PolicyConfig = {
  version: number;
  default: PolicyDefault;
  deny: {
    prompts: string[];
  };
  allow: {
    prompts: string[];
    tools: {
      "http.fetch": ToolPolicyHttpFetch;
      "fs.read": ToolPolicyFsRead;
      exec: ToolPolicyExec;
    };
  };
};

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
};

const DEFAULT_POLICY: PolicyConfig = {
  version: 1,
  default: "deny",
  deny: {
    prompts: [],
  },
  allow: {
    prompts: [],
    tools: {
      "http.fetch": { enabled: false, hosts: [], timeoutMs: 5000, maxBytes: 64_000 },
      "fs.read": { enabled: false, roots: [], maxBytes: 64_000 },
      exec: { enabled: false },
    },
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Policy must be an object.");
  }
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown, keyName: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${keyName} must be an array.`);
  }
  return value.map((item) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(`${keyName} must contain non-empty strings.`);
    }
    return item;
  });
}

function asNumber(value: unknown, fallback: number, keyName: string): number {
  if (value === undefined) {
    return fallback;
  }
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw new Error(`${keyName} must be a positive number.`);
  }
  return value;
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

export function validatePolicy(raw: unknown): PolicyConfig {
  const obj = asRecord(raw);

  if (obj.version !== 1) {
    throw new Error("Policy version must be 1.");
  }
  if (obj.default !== "allow" && obj.default !== "deny") {
    throw new Error("Policy default must be 'allow' or 'deny'.");
  }

  const allowRoot = obj.allow === undefined ? {} : asRecord(obj.allow);
  const denyRoot = obj.deny === undefined ? {} : asRecord(obj.deny);
  const toolsRoot = allowRoot.tools === undefined ? {} : asRecord(allowRoot.tools);

  const httpRoot =
    toolsRoot["http.fetch"] === undefined ? {} : asRecord(toolsRoot["http.fetch"]);
  const fsRoot = toolsRoot["fs.read"] === undefined ? {} : asRecord(toolsRoot["fs.read"]);
  const execRoot = toolsRoot.exec === undefined ? {} : asRecord(toolsRoot.exec);

  return {
    version: 1,
    default: obj.default,
    deny: {
      prompts: asStringArray(denyRoot.prompts, "deny.prompts"),
    },
    allow: {
      prompts: asStringArray(allowRoot.prompts, "allow.prompts"),
      tools: {
        "http.fetch": {
          enabled: asBoolean(httpRoot.enabled, false, "allow.tools.http.fetch.enabled"),
          hosts: asStringArray(httpRoot.hosts, "allow.tools.http.fetch.hosts"),
          timeoutMs: asNumber(httpRoot.timeoutMs, 5000, "allow.tools.http.fetch.timeoutMs"),
          maxBytes: asNumber(httpRoot.maxBytes, 64_000, "allow.tools.http.fetch.maxBytes"),
        },
        "fs.read": {
          enabled: asBoolean(fsRoot.enabled, false, "allow.tools.fs.read.enabled"),
          roots: asStringArray(fsRoot.roots, "allow.tools.fs.read.roots"),
          maxBytes: asNumber(fsRoot.maxBytes, 64_000, "allow.tools.fs.read.maxBytes"),
        },
        exec: {
          enabled: asBoolean(execRoot.enabled, false, "allow.tools.exec.enabled"),
        },
      },
    },
  };
}

export async function loadPolicyFromCwd(): Promise<PolicyConfig> {
  const policyPath = path.join(process.cwd(), ".sentinex", "policy.yaml");
  try {
    await access(policyPath);
  } catch {
    return DEFAULT_POLICY;
  }

  const yaml = await readFile(policyPath, "utf8");
  const parsed = parse(yaml);
  return validatePolicy(parsed);
}

export function evaluatePrompt(prompt: string, policy: PolicyConfig): PolicyDecision {
  for (const pattern of policy.deny.prompts) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(prompt)) {
        return { allowed: false, reason: `Matched prompt deny pattern '${pattern}'.` };
      }
    } catch {
      return { allowed: false, reason: `Invalid regex in deny.prompts: '${pattern}'.` };
    }
  }

  for (const pattern of policy.allow.prompts) {
    try {
      const regex = new RegExp(pattern);
      if (regex.test(prompt)) {
        return { allowed: true, reason: `Matched prompt allow pattern '${pattern}'.` };
      }
    } catch {
      return { allowed: false, reason: `Invalid regex in allow.prompts: '${pattern}'.` };
    }
  }

  if (policy.default === "allow") {
    return { allowed: true, reason: "No match, but policy default is allow." };
  }
  return { allowed: false, reason: "No allow pattern matched and default is deny." };
}

export function evaluateHttpFetch(
  input: HttpFetchInput,
  policy: PolicyConfig,
): PolicyDecision {
  if (!policy.allow.tools["http.fetch"].enabled) {
    return { allowed: false, reason: "http.fetch is disabled by policy." };
  }

  let hostname = "";
  try {
    const parsed = new URL(input.url);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    return { allowed: false, reason: "Invalid URL." };
  }

  const allowedHosts = policy.allow.tools["http.fetch"].hosts.map((host) => host.toLowerCase().trim());
  const isAllowed = allowedHosts.some((allowed) => {
    if (allowed.startsWith("*.")) {
      const suffix = allowed.slice(1);
      return hostname.endsWith(suffix) && hostname !== suffix.slice(1);
    }
    return hostname === allowed;
  });

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Host '${hostname}' is not in allow list.`,
    };
  }

  return { allowed: true, reason: `Host '${hostname}' is allowed.` };
}

export function evaluateFsRead(input: FsReadInput, policy: PolicyConfig): PolicyDecision {
  if (!policy.allow.tools["fs.read"].enabled) {
    return { allowed: false, reason: "fs.read is disabled by policy." };
  }

  const allowedRoots = policy.allow.tools["fs.read"].roots;
  if (allowedRoots.length === 0) {
    return { allowed: false, reason: "No fs.read roots configured." };
  }

  const requestedPath = path.resolve(process.cwd(), input.path);
  const matchesRoot = allowedRoots.some((root) => {
    const resolvedRoot = path.resolve(process.cwd(), root);
    return (
      requestedPath === resolvedRoot ||
      requestedPath.startsWith(`${resolvedRoot}${path.sep}`)
    );
  });

  if (!matchesRoot) {
    return { allowed: false, reason: "Requested path is outside allowed roots." };
  }

  return { allowed: true, reason: "Requested path is within allowed roots." };
}

export function evaluateTool(tool: ToolName, input: unknown, policy: PolicyConfig): PolicyDecision {
  if (tool === "http.fetch") {
    return evaluateHttpFetch(input as HttpFetchInput, policy);
  }
  if (tool === "fs.read") {
    return evaluateFsRead(input as FsReadInput, policy);
  }
  return { allowed: false, reason: `Tool '${tool}' is unsupported.` };
}
