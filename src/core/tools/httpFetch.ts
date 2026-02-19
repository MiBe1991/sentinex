import type { HttpFetchInput } from "../actions.js";
import type { PolicyConfig } from "../policy.js";
import { ToolExecutionError } from "../errors.js";

export type HttpFetchResult = {
  url: string;
  status: number;
  body: string;
  truncated: boolean;
};

function mergeLimits(input: HttpFetchInput, policy: PolicyConfig): { timeoutMs: number; maxBytes: number } {
  const policyCfg = policy.allow.tools["http.fetch"];
  return {
    timeoutMs: input.timeoutMs ?? policyCfg.timeoutMs,
    maxBytes: input.maxBytes ?? policyCfg.maxBytes,
  };
}

export async function runHttpFetch(
  input: HttpFetchInput,
  policy: PolicyConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<HttpFetchResult> {
  const limits = mergeLimits(input, policy);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), limits.timeoutMs);

  try {
    const response = await fetchImpl(input.url, {
      method: "GET",
      signal: controller.signal,
    });

    const text = await response.text();
    const buffer = Buffer.from(text, "utf8");
    const truncated = buffer.byteLength > limits.maxBytes;
    const body = truncated
      ? buffer.subarray(0, limits.maxBytes).toString("utf8")
      : text;

    return {
      url: input.url,
      status: response.status,
      body,
      truncated,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error.";
    throw new ToolExecutionError(`http.fetch failed: ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}
