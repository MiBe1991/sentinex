import { evaluate } from "./core/policy.js";
import { execute } from "./core/agent.js";

export async function runCLI(prompt: string) {
  console.log(`>>> Prompt: ${prompt}`);
  console.log("Evaluating policy...");

  const allowed = evaluate(prompt);
  if (!allowed) {
    console.error("Blocked by policy.");
    return;
  }

  console.log("Allowed. Executing...");
  const result = await execute(prompt);

  console.log("Result:", result);
}
