import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: path.resolve(import.meta.dirname),
  test: {
    globals: true,
    environment: "jsdom",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "shared/**/*.test.ts", "shared/**/*.spec.ts", "client/**/*.test.tsx", "client/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(import.meta.dirname, './shared'),
      '@': path.resolve(import.meta.dirname, './client/src'),
    },
  },
});
