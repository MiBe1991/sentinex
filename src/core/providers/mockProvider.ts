import type { ActionPlanProvider, ActionPlanRequest } from "./provider.js";

function extractUrl(prompt: string): string | null {
  const match = prompt.match(/https?:\/\/\S+/i);
  return match ? match[0] : null;
}

function extractReadPath(prompt: string): string | null {
  const match = prompt.match(/\bread\s+([^\s]+)\b/i);
  return match ? match[1] : null;
}

export class MockProvider implements ActionPlanProvider {
  readonly name = "mock";

  async generate(request: ActionPlanRequest): Promise<unknown> {
    const url = extractUrl(request.prompt);
    if (url) {
      return {
        actions: [
          {
            type: "tool",
            tool: "http.fetch",
            input: { url },
          },
        ],
      };
    }

    const readPath = extractReadPath(request.prompt);
    if (readPath) {
      return {
        actions: [
          {
            type: "tool",
            tool: "fs.read",
            input: { path: readPath },
          },
        ],
      };
    }

    return {
      actions: [
        {
          type: "respond",
          text: `Echo: ${request.prompt}`,
        },
      ],
    };
  }
}
