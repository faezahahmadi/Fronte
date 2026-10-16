import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The tests live in this folder, but the project root is one level up.
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
    setupFiles: ["tests/setup.js"],
    include: ["tests/**/*.test.{js,jsx}"],
  },
});
