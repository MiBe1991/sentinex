import type { RuntimeConfig } from "../config.js";
import { MockProvider } from "./mockProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";
import type { ActionPlanProvider } from "./provider.js";

export function createProvider(config: RuntimeConfig): ActionPlanProvider {
  if (config.llm.provider === "openai") {
    return new OpenAIProvider(config.llm);
  }
  return new MockProvider();
}
