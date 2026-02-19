import { loadConfigFromCwd } from "./config.js";
import { loadPolicyFromCwd } from "./policy.js";
import { MockProvider } from "./providers/mockProvider.js";
import { Runtime } from "./runtime.js";

export type ExecuteOptions = {
  dryRun?: boolean;
};

export async function executePrompt(
  prompt: string,
  options: ExecuteOptions = {},
): Promise<{ runId: string; outputs: string[] }> {
  const policy = await loadPolicyFromCwd();
  const config = await loadConfigFromCwd();
  const provider = new MockProvider();
  const runtime = new Runtime(provider, policy, config);
  return runtime.run(prompt, {
    dryRun: options.dryRun ?? config.llm.dryRunDefault,
  });
}
