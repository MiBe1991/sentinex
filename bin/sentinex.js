#!/usr/bin/env node
import { program } from "commander";
import { doctorCLI, logsExportCLI, logsShowCLI, policyLintCLI, policyTestCLI, runCLI } from "../bin/cli.js";
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

policy
  .command("lint")
  .description("Run static policy checks for risky or invalid configurations")
  .option("--json", "Output lint findings as JSON")
  .option("--fail-on <level>", "Fail on error|warn|never", "error")
  .action(async (options) => {
    const failOn =
      options.failOn === "warn" || options.failOn === "never" ? options.failOn : "error";
    await policyLintCLI({
      json: Boolean(options.json),
      failOn,
    });
  });

const logs = program.command("logs").description("Audit log commands");

logs
  .command("show")
  .description("Show recent audit events")
  .option("--limit <n>", "Number of events to show", "20")
  .option("--json", "Output full JSON events")
  .option("--run-id <id>", "Filter by run ID")
  .option("--type <name>", "Filter by event type")
  .option("--since <isoDate>", "Filter events since ISO timestamp")
  .option("--until <isoDate>", "Filter events until ISO timestamp")
  .action(async (options) => {
    const parsed = Number.parseInt(options.limit, 10);
    await logsShowCLI({
      limit: Number.isNaN(parsed) ? 20 : parsed,
      json: Boolean(options.json),
      runId: options.runId,
      type: options.type,
      since: options.since,
      until: options.until,
    });
  });

logs
  .command("export")
  .description("Export audit events to a JSON/JSONL file")
  .requiredOption("--output <path>", "Output file path")
  .option("--format <kind>", "json or jsonl", "json")
  .option("--run-id <id>", "Filter by run ID")
  .option("--type <name>", "Filter by event type")
  .option("--since <isoDate>", "Filter events since ISO timestamp")
  .option("--until <isoDate>", "Filter events until ISO timestamp")
  .action(async (options) => {
    const format = options.format === "jsonl" ? "jsonl" : "json";
    await logsExportCLI({
      output: options.output,
      format,
      runId: options.runId,
      type: options.type,
      since: options.since,
      until: options.until,
    });
  });

program
  .command("doctor")
  .description("Check runtime configuration, policy, and provider prerequisites")
  .option("--json", "Output checks as JSON")
  .option("--strict", "Treat warnings as failures (exit code includes 64)")
  .action(async (options) => {
    await doctorCLI({ json: Boolean(options.json), strict: Boolean(options.strict) });
  });

program.parse(process.argv);
