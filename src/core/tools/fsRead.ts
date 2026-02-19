import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FsReadInput } from "../actions.js";
import type { PolicyConfig } from "../policy.js";
import { ToolExecutionError } from "../errors.js";

export type FsReadResult = {
  path: string;
  content: string;
  truncated: boolean;
};

export async function runFsRead(
  input: FsReadInput,
  policy: PolicyConfig,
): Promise<FsReadResult> {
  const maxBytes = input.maxBytes ?? policy.allow.tools["fs.read"].maxBytes;
  const absolutePath = path.resolve(process.cwd(), input.path);

  try {
    const raw = await readFile(absolutePath);
    const truncated = raw.byteLength > maxBytes;
    const outputBuffer = truncated ? raw.subarray(0, maxBytes) : raw;
    return {
      path: input.path,
      content: outputBuffer.toString("utf8"),
      truncated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fs.read error.";
    throw new ToolExecutionError(`fs.read failed: ${message}`);
  }
}
