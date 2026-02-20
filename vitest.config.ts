import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/core/providers/provider.ts"],
      thresholds: {
        lines: 45,
        functions: 50,
        branches: 55,
        statements: 45,
      },
    },
  },
});
