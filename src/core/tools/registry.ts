import type { FsReadInput, HttpFetchInput, ToolAction, ToolName } from "../actions.js";
import type { PolicyConfig } from "../policy.js";
import { runFsRead } from "./fsRead.js";
import { runHttpFetch } from "./httpFetch.js";
import { ToolExecutionError } from "../errors.js";

export type ToolContext = {
  policy: PolicyConfig;
};

export type ToolRegistry = {
  execute(action: ToolAction, context: ToolContext): Promise<unknown>;
};

type ToolExecutor = (input: unknown, context: ToolContext) => Promise<unknown>;

function isToolName(value: string): value is ToolName {
  return value === "http.fetch" || value === "fs.read";
}

function asHttpFetchInput(input: unknown): HttpFetchInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ToolExecutionError("http.fetch input must be an object.");
  }
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.url !== "string") {
    throw new ToolExecutionError("http.fetch input url must be a string.");
  }
  return {
    url: candidate.url,
    timeoutMs: typeof candidate.timeoutMs === "number" ? candidate.timeoutMs : undefined,
    maxBytes: typeof candidate.maxBytes === "number" ? candidate.maxBytes : undefined,
  };
}

function asFsReadInput(input: unknown): FsReadInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new ToolExecutionError("fs.read input must be an object.");
  }
  const candidate = input as Record<string, unknown>;
  if (typeof candidate.path !== "string") {
    throw new ToolExecutionError("fs.read input path must be a string.");
  }
  return {
    path: candidate.path,
    maxBytes: typeof candidate.maxBytes === "number" ? candidate.maxBytes : undefined,
  };
}

export function createToolRegistry(): ToolRegistry {
  const handlers: Record<ToolName, ToolExecutor> = {
    "http.fetch": async (input, context) =>
      runHttpFetch(asHttpFetchInput(input), context.policy),
    "fs.read": async (input, context) => runFsRead(asFsReadInput(input), context.policy),
  };

  return {
    async execute(action, context) {
      if (!isToolName(action.tool)) {
        throw new ToolExecutionError(`Unknown tool: ${action.tool}`);
      }
      return handlers[action.tool](action.input, context);
    },
  };
}
