#!/usr/bin/env node
import { program } from "commander";
import { runCLI } from "../bin/cli.js";

program
  .name("sentinex")
  .version("0.1.0")
  .description("Sentinex Secure Local Agent CLI Runtime");

program
  .command("run <prompt...>")
  .description("Run a prompt through the agent")
  .action(async (prompt) => {
    await runCLI(prompt.join(" "));
  });

program.parse(process.argv);
