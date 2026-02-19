#!/usr/bin/env node
import { program } from "commander";
import { logsShowCLI, policyTestCLI, runCLI } from "../bin/cli.js";
import { initProject } from "../bin/core/init.js";

program
  .name("sentinex")
  .version("0.1.0")
  .description("Sentinex Secure Local Agent CLI Runtime");

program
  .command("run <prompt...>")
  .description("Run a prompt through the agent")
  .option("--dry-run", "Plan and policy-check actions without executing tools")
  .action(async (prompt, options) => {
    await runCLI(prompt.join(" "), {
      dryRun: Boolean(options.dryRun),
    });
  });

program
  .command("init")
  .description("Initialize .sentinex policy/config in the current directory")
  .option("-f, --force", "Overwrite existing files")
  .action(async (options) => {
    const result = await initProject(Boolean(options.force));

    if (result.createdDir) {
      console.log("Created .sentinex/ directory.");
    }

    for (const file of result.writtenFiles) {
      console.log(`Wrote ${file}`);
    }

    for (const file of result.skippedFiles) {
      console.log(`Skipped ${file} (use --force to overwrite)`);
    }
  });

const policy = program.command("policy").description("Policy inspection commands");

policy
  .command("test")
  .description("Evaluate policy decisions for prompt or tool requests")
  .option("--prompt <text>", "Prompt text to evaluate")
  .option("--tool <name>", "Tool name (http.fetch or fs.read)")
  .option("--url <url>", "URL for --tool http.fetch")
  .option("--path <path>", "Path for --tool fs.read")
  .action(async (options) => {
    await policyTestCLI({
      prompt: options.prompt,
      tool: options.tool,
      url: options.url,
      filePath: options.path,
    });
  });

const logs = program.command("logs").description("Audit log commands");

logs
  .command("show")
  .description("Show recent audit events")
  .option("--limit <n>", "Number of events to show", "20")
  .action(async (options) => {
    const parsed = Number.parseInt(options.limit, 10);
    await logsShowCLI({
      limit: Number.isNaN(parsed) ? 20 : parsed,
    });
  });

program.parse(process.argv);
