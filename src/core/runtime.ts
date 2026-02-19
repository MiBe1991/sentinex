import { randomUUID } from "node:crypto";
import type { Action, ActionPlan, ToolAction } from "./actions.js";
import { validateActionPlan } from "./actions.js";
import { requestApproval } from "./approval.js";
import { AuditLogger } from "./audit.js";
import type { RuntimeConfig } from "./config.js";
import { ActionPlanValidationError, PolicyDeniedError } from "./errors.js";
import type { PolicyConfig } from "./policy.js";
import { evaluatePrompt, evaluateTool } from "./policy.js";
import type { ActionPlanProvider } from "./providers/provider.js";
import { createToolRegistry } from "./tools/registry.js";

export type RuntimeOptions = {
  dryRun: boolean;
};

export type RuntimeResult = {
  runId: string;
  outputs: string[];
};

function actionSummary(action: Action): string {
  if (action.type === "respond") {
    return `respond("${action.text}")`;
  }
  return `tool(${action.tool})`;
}

function ensureToolAction(action: Action): ToolAction {
  if (action.type !== "tool") {
    throw new ActionPlanValidationError("Expected tool action.");
  }
  return action;
}

export class Runtime {
  private readonly provider: ActionPlanProvider;
  private readonly policy: PolicyConfig;
  private readonly config: RuntimeConfig;
  private readonly audit: AuditLogger;

  constructor(provider: ActionPlanProvider, policy: PolicyConfig, config: RuntimeConfig) {
    this.provider = provider;
    this.policy = policy;
    this.config = config;
    this.audit = new AuditLogger(config);
  }

  async run(prompt: string, options: RuntimeOptions): Promise<RuntimeResult> {
    const runId = randomUUID();
    let status: "ok" | "error" = "error";
    try {
      await this.audit.append({
        type: "run.started",
        runId,
        prompt,
        dryRun: options.dryRun,
        timestamp: new Date().toISOString(),
      });

      const promptDecision = evaluatePrompt(prompt, this.policy);
      if (!promptDecision.allowed) {
        await this.audit.append({
          type: "policy.decision",
          runId,
          allowed: false,
          reason: promptDecision.reason,
          action: { type: "prompt" },
          timestamp: new Date().toISOString(),
        });
        throw new PolicyDeniedError(promptDecision.reason);
      }

      const rawPlan = await this.provider.generate({ prompt });
      const plan = this.parsePlan(rawPlan);
      const outputs: string[] = [];
      const registry = createToolRegistry();

      for (const action of plan.actions) {
        await this.audit.append({
          type: "action.requested",
          runId,
          action,
          timestamp: new Date().toISOString(),
        });

        if (action.type === "respond") {
          outputs.push(action.text);
          await this.audit.append({
            type: "action.result",
            runId,
            success: true,
            result: action.text,
            action,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const toolAction = ensureToolAction(action);
        const decision = evaluateTool(toolAction.tool, toolAction.input, this.policy);
        await this.audit.append({
          type: "policy.decision",
          runId,
          allowed: decision.allowed,
          reason: decision.reason,
          action,
          timestamp: new Date().toISOString(),
        });
        if (!decision.allowed) {
          throw new PolicyDeniedError(`Action ${actionSummary(action)} denied: ${decision.reason}`);
        }

        if (options.dryRun) {
          outputs.push(`[dry-run] ${actionSummary(action)}`);
          await this.audit.append({
            type: "action.result",
            runId,
            success: true,
            result: "[dry-run]",
            action,
            timestamp: new Date().toISOString(),
          });
          continue;
        }

        const approved = await requestApproval(
          this.config.approval.mode,
          `Approve ${actionSummary(action)}?`,
        );
        if (!approved) {
          throw new PolicyDeniedError(`Action ${actionSummary(action)} denied by user approval.`);
        }

        try {
          const result = await registry.execute(toolAction, { policy: this.policy });
          outputs.push(JSON.stringify(result, null, 2));
          await this.audit.append({
            type: "action.result",
            runId,
            success: true,
            result,
            action,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown tool error.";
          await this.audit.append({
            type: "action.result",
            runId,
            success: false,
            result: message,
            action,
            timestamp: new Date().toISOString(),
          });
          throw error;
        }
      }

      status = "ok";
      return { runId, outputs };
    } finally {
      await this.audit.append({
        type: "run.finished",
        runId,
        status,
        timestamp: new Date().toISOString(),
      });
    }
  }

  private parsePlan(raw: unknown): ActionPlan {
    return validateActionPlan(raw);
  }
}
