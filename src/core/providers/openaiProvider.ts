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
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
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
      throw new ToolExecutionError(`OpenAI request failed (${response.status}): ${body}`);
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
  }
}
