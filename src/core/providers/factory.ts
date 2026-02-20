import type { RuntimeConfig } from "../config.js";
import { FallbackProvider } from "./fallbackProvider.js";
import { MockProvider } from "./mockProvider.js";
import { OpenAIProvider } from "./openaiProvider.js";
import type { ActionPlanProvider } from "./provider.js";

export function createProvider(config: RuntimeConfig): ActionPlanProvider {
  if (config.llm.provider === "openai") {
    if (config.llm.fallbackToMock) {
      return new FallbackProvider([new OpenAIProvider(config.llm), new MockProvider()]);
    }
    return new OpenAIProvider(config.llm);
  }
  return new MockProvider();
}
