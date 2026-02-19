import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { executePrompt } from "./core/agent.js";
import { loadConfigFromCwd } from "./core/config.js";
import { loadPolicyFromCwd, evaluatePrompt, evaluateTool } from "./core/policy.js";

export async function runCLI(prompt: string, options: { dryRun?: boolean } = {}) {
  console.log(`>>> Prompt: ${prompt}`);

  try {
    const result = await executePrompt(prompt, { dryRun: options.dryRun });
    console.log(`Run ID: ${result.runId}`);
    for (const output of result.outputs) {
      console.log("Result:", output);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown runtime error.";
    console.error(`Run failed: ${message}`);
  }
}

export async function policyTestCLI(options: {
  prompt?: string;
  tool?: string;
  url?: string;
  filePath?: string;
}) {
  try {
    const policy = await loadPolicyFromCwd();

    if (options.prompt) {
      const decision = evaluatePrompt(options.prompt, policy);
      console.log(JSON.stringify({ target: "prompt", ...decision }, null, 2));
      return;
    }

    if (options.tool === "http.fetch" && options.url) {
      const decision = evaluateTool("http.fetch", { url: options.url }, policy);
      console.log(JSON.stringify({ target: "http.fetch", input: { url: options.url }, ...decision }, null, 2));
      return;
    }

    if (options.tool === "fs.read" && options.filePath) {
      const decision = evaluateTool("fs.read", { path: options.filePath }, policy);
      console.log(
        JSON.stringify({ target: "fs.read", input: { path: options.filePath }, ...decision }, null, 2),
      );
      return;
    }

    console.error(
      "Usage: sentinex policy test --prompt <text> | --tool http.fetch --url <url> | --tool fs.read --path <path>",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown policy test error.";
    console.error(`Policy test failed: ${message}`);
  }
}

export async function logsShowCLI(options: { limit?: number }) {
  try {
    const config = await loadConfigFromCwd();
    const filePath = path.resolve(process.cwd(), config.audit.file);

    try {
      await access(filePath);
    } catch {
      console.log(`No audit log found at ${filePath}`);
      return;
    }

    const raw = await readFile(filePath, "utf8");
    const lines = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const limit = options.limit && options.limit > 0 ? options.limit : 20;
    const selected = lines.slice(-limit);
    for (const line of selected) {
      try {
        const parsed = JSON.parse(line) as { type?: string; timestamp?: string; runId?: string };
        console.log(`${parsed.timestamp ?? "-"} ${parsed.type ?? "event"} ${parsed.runId ?? ""}`.trim());
      } catch {
        console.log(line);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown logs error.";
    console.error(`Logs show failed: ${message}`);
  }
}
