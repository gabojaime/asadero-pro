import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.integration.test.tsx"],
    environmentMatchGlobs: [
      ["src/**/*.integration.test.tsx", "jsdom"],
    ],
    setupFiles: ["src/domains/orders/presentation/testing/setup-integration.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
