import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

import pkg from "./package.json" with { type: "json" };

// Everything shipped as a dependency stays external so a consumer that already
// uses Radix or lucide does not end up with two copies in its bundle.
const external = [
	...Object.keys(pkg.dependencies),
	...Object.keys(pkg.peerDependencies),
	"react/jsx-runtime",
].map((name) => new RegExp(`^${name}(/.*)?$`));

export default defineConfig({
	plugins: [
		react(),
		dts({
			tsconfigPath: "./tsconfig.build.json",
			rollupTypes: true,
		}),
	],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "src"),
		},
	},
	build: {
		lib: {
			entry: resolve(import.meta.dirname, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
		},
		rollupOptions: { external },
		sourcemap: true,
		emptyOutDir: true,
	},
});
