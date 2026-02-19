import { ActionPlanValidationError } from "./errors.js";

export type RespondAction = {
  type: "respond";
  text: string;
};

export type HttpFetchInput = {
  url: string;
  timeoutMs?: number;
  maxBytes?: number;
};

export type FsReadInput = {
  path: string;
  maxBytes?: number;
};

export type ToolName = "http.fetch" | "fs.read";

export type ToolAction = {
  type: "tool";
  tool: ToolName;
  input: HttpFetchInput | FsReadInput;
};

export type Action = RespondAction | ToolAction;

export type ActionPlan = {
  actions: Action[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ActionPlanValidationError("Action plan must be an object.");
  }
  return value as Record<string, unknown>;
}

function parseToolInput(tool: ToolName, input: unknown): HttpFetchInput | FsReadInput {
  const obj = asRecord(input);

  if (tool === "http.fetch") {
    if (typeof obj.url !== "string" || obj.url.length === 0) {
      throw new ActionPlanValidationError("http.fetch input requires url.");
    }
    if (obj.timeoutMs !== undefined && typeof obj.timeoutMs !== "number") {
      throw new ActionPlanValidationError("http.fetch timeoutMs must be a number.");
    }
    if (obj.maxBytes !== undefined && typeof obj.maxBytes !== "number") {
      throw new ActionPlanValidationError("http.fetch maxBytes must be a number.");
    }
    return {
      url: obj.url,
      timeoutMs: obj.timeoutMs as number | undefined,
      maxBytes: obj.maxBytes as number | undefined,
    };
  }

  if (typeof obj.path !== "string" || obj.path.length === 0) {
    throw new ActionPlanValidationError("fs.read input requires path.");
  }
  if (obj.maxBytes !== undefined && typeof obj.maxBytes !== "number") {
    throw new ActionPlanValidationError("fs.read maxBytes must be a number.");
  }
  return {
    path: obj.path,
    maxBytes: obj.maxBytes as number | undefined,
  };
}

function parseAction(value: unknown): Action {
  const obj = asRecord(value);
  if (obj.type === "respond") {
    if (typeof obj.text !== "string") {
      throw new ActionPlanValidationError("respond action requires text.");
    }
    return { type: "respond", text: obj.text };
  }

  if (obj.type === "tool") {
    if (obj.tool !== "http.fetch" && obj.tool !== "fs.read") {
      throw new ActionPlanValidationError("Unsupported tool action.");
    }
    const input = parseToolInput(obj.tool, obj.input);
    return {
      type: "tool",
      tool: obj.tool,
      input,
    };
  }

  throw new ActionPlanValidationError("Unknown action type.");
}

export function validateActionPlan(raw: unknown): ActionPlan {
  const obj = asRecord(raw);
  if (!Array.isArray(obj.actions)) {
    throw new ActionPlanValidationError("Action plan requires actions array.");
  }
  return {
    actions: obj.actions.map(parseAction),
  };
}
