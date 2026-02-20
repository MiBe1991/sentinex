import { ToolExecutionError } from "../errors.js";
import type { ActionPlanProvider, ActionPlanRequest } from "./provider.js";

export class FallbackProvider implements ActionPlanProvider {
  readonly name: string;
  private readonly providers: ActionPlanProvider[];

  constructor(providers: ActionPlanProvider[]) {
    this.providers = providers;
    this.name = providers.map((provider) => provider.name).join("->");
  }

  async generate(request: ActionPlanRequest): Promise<unknown> {
    let lastError: Error | null = null;
    for (const provider of this.providers) {
      try {
        return await provider.generate(request);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown provider error.");
      }
    }

    const message = lastError?.message ?? "No provider available.";
    throw new ToolExecutionError(`Provider fallback chain failed: ${message}`);
  }
}
