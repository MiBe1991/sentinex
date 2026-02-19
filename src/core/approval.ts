import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type { ApprovalMode } from "./config.js";

export async function requestApproval(
  mode: ApprovalMode,
  question: string,
): Promise<boolean> {
  if (mode === "auto-approve") {
    return true;
  }
  if (mode === "auto-deny") {
    return false;
  }

  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    const normalized = answer.trim().toLowerCase();
    return normalized === "y" || normalized === "yes";
  } finally {
    rl.close();
  }
}
