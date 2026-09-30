/// <reference types="vitest/config" />
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: resolve(rootDir, "src/index.ts"),
			name: "FalkorDBChat",
			formats: ["es", "cjs"],
			fileName: (format) => `chat.${format === "es" ? "js" : "cjs"}`,
		},
		sourcemap: true,
		emptyOutDir: true,
	},
	test: {
		environment: "jsdom",
		include: ["tests/**/*.test.ts"],
		restoreMocks: true,
	},
});
