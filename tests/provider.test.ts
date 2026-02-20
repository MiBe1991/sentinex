import { afterEach, describe, expect, it, vi } from "vitest";
import { validateConfig } from "../src/core/config.js";
import { ToolExecutionError } from "../src/core/errors.js";
import { createProvider } from "../src/core/providers/factory.js";
import { OpenAIProvider } from "../src/core/providers/openaiProvider.js";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});

describe("provider factory", () => {
  it("creates mock provider by default", () => {
    const config = validateConfig({ version: 1 });
    const provider = createProvider(config);
    expect(provider.name).toBe("mock");
  });

  it("creates openai provider when configured", () => {
    const config = validateConfig({
      version: 1,
      llm: {
        provider: "openai",
      },
    });
    const provider = createProvider(config);
    expect(provider.name).toBe("openai");
  });

  it("falls back from openai to mock when configured", async () => {
    delete process.env.OPENAI_API_KEY;
    const config = validateConfig({
      version: 1,
      llm: {
        provider: "openai",
        fallbackToMock: true,
      },
    });
    const provider = createProvider(config);
    const plan = (await provider.generate({ prompt: "hello fallback" })) as {
      actions: Array<{ type: string; text?: string }>;
    };
    expect(provider.name).toBe("openai->mock");
    expect(plan.actions[0]?.type).toBe("respond");
  });
});

describe("OpenAIProvider", () => {
  it("fails when API key env var is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const config = validateConfig({
      version: 1,
      llm: {
        provider: "openai",
      },
    });
    const provider = new OpenAIProvider(config.llm, vi.fn() as unknown as typeof fetch);
    await expect(provider.generate({ prompt: "hello" })).rejects.toBeInstanceOf(ToolExecutionError);
  });

  it("parses action-plan JSON from model response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const config = validateConfig({
      version: 1,
      llm: {
        provider: "openai",
      },
    });

    const mockFetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "{\"actions\":[{\"type\":\"respond\",\"text\":\"ok\"}]}",
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const provider = new OpenAIProvider(config.llm, mockFetch as unknown as typeof fetch);
    const plan = await provider.generate({ prompt: "test" });
    expect(plan).toEqual({
      actions: [{ type: "respond", text: "ok" }],
    });
  });

  it("retries retryable status codes and succeeds", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const config = validateConfig({
      version: 1,
      llm: {
        provider: "openai",
        maxRetries: 1,
        retryDelayMs: 1,
      },
    });

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "{\"actions\":[{\"type\":\"respond\",\"text\":\"ok\"}]}" } }],
          }),
          { status: 200 },
        ),
      );

    const provider = new OpenAIProvider(config.llm, mockFetch as unknown as typeof fetch);
    const plan = await provider.generate({ prompt: "retry please" });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(plan).toEqual({
      actions: [{ type: "respond", text: "ok" }],
    });
  });
});
