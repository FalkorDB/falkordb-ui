import { resolve } from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: { "@": resolve(import.meta.dirname, "src") },
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/setup.ts"],
		include: ["tests/**/*.test.{ts,tsx}"],
		restoreMocks: true,
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,tsx}"],
			// Barrel file: re-exports only, nothing to exercise.
			exclude: ["src/index.ts"],
			reporter: ["text", "lcov"],
			thresholds: { "100": true },
		},
	},
});
