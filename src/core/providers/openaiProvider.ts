import { ToolExecutionError } from "../errors.js";
import type { RuntimeConfig } from "../config.js";
import type { ActionPlanProvider, ActionPlanRequest } from "./provider.js";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
};

const RETRYABLE_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

function extractContent(content: OpenAIChatResponse["choices"]): string {
  const first = content?.[0]?.message?.content;
  if (!first) {
    throw new ToolExecutionError("OpenAI response did not include message content.");
  }
  if (typeof first === "string") {
    return first;
  }
  const text = first
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
  if (!text) {
    throw new ToolExecutionError("OpenAI response content was empty.");
  }
  return text;
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  throw new ToolExecutionError("OpenAI response did not contain JSON.");
}

export class OpenAIProvider implements ActionPlanProvider {
  readonly name = "openai";
  private readonly config: RuntimeConfig["llm"];
  private readonly fetchImpl: typeof fetch;

  constructor(config: RuntimeConfig["llm"], fetchImpl: typeof fetch = fetch) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async generate(request: ActionPlanRequest): Promise<unknown> {
    const apiKey = process.env[this.config.apiKeyEnv];
    if (!apiKey) {
      throw new ToolExecutionError(
        `Missing API key. Set environment variable ${this.config.apiKeyEnv}.`,
      );
    }

    const endpoint = `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const totalAttempts = this.config.maxRetries + 1;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await this.fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: this.config.model,
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: this.config.systemPrompt,
              },
              {
                role: "user",
                content: request.prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          const retryable = shouldRetryStatus(response.status);
          const error = new ToolExecutionError(
            `OpenAI request failed (${response.status})${retryable ? " [retryable]" : ""}: ${body}`,
          );
          if (retryable && attempt < totalAttempts) {
            lastError = error;
            const delay = this.config.retryDelayMs * 2 ** (attempt - 1);
            await sleep(delay);
            continue;
          }
          throw error;
        }

        const data = (await response.json()) as OpenAIChatResponse;
        const content = extractContent(data.choices);
        const jsonBody = extractJsonObject(content);

        try {
          return JSON.parse(jsonBody);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown JSON parse error.";
          throw new ToolExecutionError(`OpenAI JSON parse failed: ${message}`);
        }
      } catch (error) {
        if (error instanceof ToolExecutionError) {
          const retryable = error.message.includes("[retryable]");
          if (retryable && attempt < totalAttempts) {
            lastError = error;
            const delay = this.config.retryDelayMs * 2 ** (attempt - 1);
            await sleep(delay);
            continue;
          }
          throw error;
        }
        const isAbortError = error instanceof Error && error.name === "AbortError";
        const isNetworkError = error instanceof TypeError;
        const retryable = isAbortError || isNetworkError;
        const baseMessage =
          error instanceof Error ? error.message : "Unknown provider request error.";
        const wrapped = new ToolExecutionError(
          `OpenAI request error${retryable ? " [retryable]" : ""}: ${baseMessage}`,
        );
        if (retryable && attempt < totalAttempts) {
          lastError = wrapped;
          const delay = this.config.retryDelayMs * 2 ** (attempt - 1);
          await sleep(delay);
          continue;
        }
        throw wrapped;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new ToolExecutionError("OpenAI request failed without a specific error.");
  }
}
