import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["**/*.ts"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
        "playground/**",
      ],
    },
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.d.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "apisix-sdk": resolve(__dirname, "../packages/apisix-sdk/src"),
    },
  },
});
