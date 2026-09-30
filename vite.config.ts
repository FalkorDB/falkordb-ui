import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const rootDir = dirname(fileURLToPath(import.meta.url));

// Read rather than `import ... with { type: "json" }`: import attributes are not
// available across every Node version this package supports.
const pkg = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8")) as {
	dependencies: Record<string, string>;
	peerDependencies: Record<string, string>;
};

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
			"@": resolve(rootDir, "src"),
		},
	},
	build: {
		lib: {
			entry: resolve(rootDir, "src/index.ts"),
			formats: ["es", "cjs"],
			fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
		},
		rollupOptions: { external },
		sourcemap: true,
		emptyOutDir: true,
	},
});
